// rules.js
// Pure functions only — no Phaser, no game state. The active ruleset is
// always *derived*: base ruleset + every letter whose effectiveDay has
// passed. Save games therefore only need the current day plus player
// state; the rules reconstruct themselves.

import { baseRuleset } from '../data/ruleset.js';
import { letters } from '../data/letters.js';

// ---------- patch machinery ----------

function resolve(obj, path) {
  const keys = path.split('.');
  const last = keys.pop();
  let node = obj;
  for (const k of keys) {
    if (node[k] === undefined) node[k] = {};
    node = node[k];
  }
  return [node, last];
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyOp(ruleset, { op, path, value }) {
  const [parent, key] = resolve(ruleset, path);
  const current = parent[key];

  if (op === 'set') {
    parent[key] = value;
  } else if (op === 'add') {
    if (Array.isArray(current)) {
      if (!current.some((v) => deepEqual(v, value))) current.push(value);
    } else {
      parent[key] = [value];
    }
  } else if (op === 'remove') {
    if (value === undefined) {
      delete parent[key];
    } else if (Array.isArray(current)) {
      parent[key] = current.filter((v) => !deepEqual(v, value));
    }
  }
  return ruleset;
}

// ---------- the active ruleset ----------

export function activeRuleset(day, subscriptions = {}) {
  const rs = structuredClone(baseRuleset);
  const due = letters
    .filter((l) => l.effectiveDay <= day)
    .sort((a, b) => a.effectiveDay - b.effectiveDay);
  for (const letter of due) {
    for (const op of letter.ops) applyOp(rs, op);
    rs.version += 1;
  }
  // Player-purchased subscriptions are layered on last.
  for (const [binId, paid] of Object.entries(subscriptions)) {
    if (paid && rs.bins[binId] && rs.bins[binId].subscription) {
      rs.bins[binId].subscription.subscribed = true;
    }
  }
  return rs;
}

export function lettersArrivingOn(day) {
  return letters.filter((l) => l.arrivesDay === day);
}

export function allLetters() {
  return letters;
}

// ---------- calendar ----------

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekday(day) {
  return day % 7; // day 0 is a Monday
}

export function weekInCycle(day, rs) {
  return Math.floor(day / 7) % rs.rota.cycleWeeks;
}

// Which bins are collected on an absolute day, holiday shifts applied.
export function collectionsOn(day, rs) {
  const collected = new Set();
  const inShiftWindow = (d) =>
    rs.rota.holidayShifts.some((s) => d >= s.fromDay && d <= s.toDay);

  // Nominal collections due today, unless today sits inside a shift window
  // (in which case they have been pushed later).
  if (!inShiftWindow(day)) {
    for (const c of rs.rota.collections) {
      if (c.weekday === weekday(day) && c.weekInCycle === weekInCycle(day, rs)) {
        c.bins.forEach((b) => collected.add(b));
      }
    }
  }

  // Collections shifted forward onto today from an earlier nominal day.
  for (const s of rs.rota.holidayShifts) {
    const nominal = day - s.shiftDays;
    if (nominal < s.fromDay || nominal > s.toDay) continue;
    for (const c of rs.rota.collections) {
      if (
        c.weekday === weekday(nominal) &&
        c.weekInCycle === weekInCycle(nominal, rs)
      ) {
        c.bins.forEach((b) => collected.add(b));
      }
    }
  }

  return [...collected];
}

export function nextCollectionDay(fromDay, rs, lookahead = 28) {
  for (let d = fromDay; d < fromDay + lookahead; d++) {
    const bins = collectionsOn(d, rs);
    if (bins.length) return { day: d, bins };
  }
  return null;
}

// ---------- gameplay queries ----------

function needsUnpaidSubscription(bin, category) {
  const sub = bin.subscription;
  return !!sub && !sub.subscribed && (!sub.appliesTo || sub.appliesTo === category);
}

// Which bin *should* an item of this category go in right now?
// Empty array = nothing takes it (tip run / bottle bank / bulky booking).
export function correctBinsFor(category, rs) {
  return Object.entries(rs.bins)
    .filter(([, bin]) => bin.active && bin.accepts.includes(category))
    .filter(([, bin]) => !needsUnpaidSubscription(bin, category))
    .map(([id]) => id);
}

export function contamination(binType, items, rs) {
  const bin = rs.bins[binType];
  if (!bin) return [];
  return items.filter(
    (item) =>
      !bin.accepts.includes(item.category) ||
      needsUnpaidSubscription(bin, item.category)
  );
}

export function fillLevel(binType, items, rs) {
  const used = items.reduce((n, i) => n + i.volume, 0);
  return used / rs.bins[binType].capacity;
}

// Was the bin actually on the kerb when the lorry came at deadlineHour?
export function presentAtCollection(binState, day, rs) {
  if (!binState.atKerb) return false;
  if (binState.putOutDay < day) return true;
  return binState.putOutDay === day && binState.putOutHour < rs.rota.deadlineHour;
}

// Out so early the street has noticed. Purely a neighbour-relations thing.
export function putOutTooEarly(binState, day) {
  return binState.atKerb && binState.putOutDay <= day - 2;
}

// One verdict per presented bin. binType is the ruleset key ('blue'), which
// may differ from the state key (a neighbour's bin lives under 'neighbour').
export function collectionVerdict(binType, binState, day, rs) {
  if (!collectionsOn(day, rs).includes(binType))
    return { collected: false, reason: 'not-due' };

  if (!presentAtCollection(binState, day, rs))
    return { collected: false, reason: 'missed-deadline' };

  // On its side after a gale. The crew will not right it for you.
  if (binState.tipped) return { collected: false, reason: 'tipped' };

  const over = fillLevel(binType, binState.items, rs) > 1;
  if (rs.conduct.lidMustClose && over)
    return { collected: false, reason: 'lid-open' };

  const dirty = contamination(binType, binState.items, rs);
  if (dirty.length && rs.conduct.contaminationSticker)
    return { collected: false, reason: 'contaminated', items: dirty };

  return { collected: true };
}
