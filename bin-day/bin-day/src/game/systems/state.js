// state.js
// Game state and the day-advance pipeline. No Phaser in here either — the
// scene and the HTML overlay both read from this and emit intents back.

import { items as catalogue, dailyProduction } from '../data/items.js';
import { scripted, random as randomEvents } from '../data/events.js';
import {
  activeRuleset, collectionsOn, nextCollectionDay, lettersArrivingOn,
  collectionVerdict, fillLevel, weekday, DAY_NAMES, putOutTooEarly,
} from './rules.js';
import { newStreet, decideStreet, resolveStreet } from './street.js';

// Deterministic PRNG so a seed reproduces a whole run — handy for debugging
// a "why did that bin get rejected" report.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const itemById = Object.fromEntries(catalogue.map((i) => [i.id, i]));
let uid = 0;
export function makeItem(id) {
  const def = itemById[id];
  return { ...def, uid: `i${uid++}` };
}

export function newGame(seed = 20260726) {
  const state = {
    day: 0,
    seed,
    rand: mulberry32(seed),
    standing: 60,       // how the street feels about you, 0–100
    money: 150,
    tray: [],           // waste waiting to be sorted
    bins: {},           // stateKey -> { type, items, atKerb, putOutDay, putOutHour }
    subscriptions: {},  // binType -> true
    inbox: [],          // council letters received
    messages: [],       // phone messages
    favour: null,       // active neighbour favour
    log: [],            // day-by-day outcome feed
    firedEvents: new Set(),
    street: newStreet(),
    productionWeights: {},
    over: false,
  };
  syncBins(state);
  produce(state);
  return state;
}

export function rulesFor(state) {
  return activeRuleset(state.day, state.subscriptions);
}

// Bins appear when a letter activates them (the caddy).
function syncBins(state) {
  const rs = rulesFor(state);
  for (const [type, bin] of Object.entries(rs.bins)) {
    if (!bin.active) continue;
    if (!state.bins[type]) {
      state.bins[type] = {
        type, items: [], atKerb: false, putOutDay: -99, putOutHour: 0,
      };
    }
  }
}

// ---------- player intents ----------

export function binItem(state, itemUid, binKey) {
  const idx = state.tray.findIndex((i) => i.uid === itemUid);
  if (idx === -1 || !state.bins[binKey]) return false;
  const [item] = state.tray.splice(idx, 1);
  state.bins[binKey].items.push(item);
  return true;
}

// Fishing the nappy back out of the recycling. Essential: without it a
// bin that becomes non-compliant after a rule change is stuck forever.
export function unbinItem(state, binKey, itemUid) {
  const bin = state.bins[binKey];
  if (!bin) return false;
  const idx = bin.items.findIndex((i) => i.uid === itemUid);
  if (idx === -1) return false;
  const [item] = bin.items.splice(idx, 1);
  state.tray.push(item);
  return true;
}

export function toggleKerb(state, binKey) {
  const bin = state.bins[binKey];
  if (!bin) return;
  bin.atKerb = !bin.atKerb;
  if (bin.atKerb) {
    bin.putOutDay = state.day;
    bin.putOutHour = 18; // you do it in the evening, like everyone else
  }
}

export function buySubscription(state, binType) {
  const rs = rulesFor(state);
  const sub = rs.bins[binType] && rs.bins[binType].subscription;
  if (!sub || sub.subscribed) return { ok: false, why: 'nothing to buy' };
  if (state.money < sub.costPerYear) return { ok: false, why: 'not enough money' };
  state.money -= sub.costPerYear;
  state.subscriptions[binType] = true;
  return { ok: true };
}

// The tip takes what no bin will. Weekends only, and it eats the day.
export function tipRun(state) {
  if (weekday(state.day) < 5) return { ok: false, why: 'The tip queue is only worth it at the weekend.' };
  const takeable = ['bulky', 'hazardous', 'electricals', 'textiles', 'glass', 'garden'];
  const before = state.tray.length;
  state.tray = state.tray.filter((i) => !takeable.includes(i.category));
  return { ok: true, removed: before - state.tray.length };
}

export function answerFavour(state, accept) {
  if (!state.favour || state.favour.status !== 'asked') return;
  if (accept) {
    state.favour.status = 'accepted';
    state.bins.neighbour = {
      type: state.favour.binType,
      neighbour: true,
      items: [],
      atKerb: false,
      putOutDay: -99,
      putOutHour: 0,
    };
  } else {
    state.favour.status = 'declined';
    state.standing -= 2;
    pushLog(state, `You told ${state.favour.from} you couldn't help.`, 'bad');
    state.favour = null;
  }
}

// ---------- day advance ----------

export function advanceDay(state) {
  const rsTonight = rulesFor(state);
  // The neighbours look out of the window before bed and decide what to do
  // about tomorrow, based on whatever is standing on your kerb right now.
  decideStreet(state, rsTonight, state.day + 1);

  state.day += 1;
  state.dayLog = [];
  const rs = rulesFor(state);

  syncBins(state);
  resolveCollections(state, rs);
  resolveStreet(state, rs, (text, tone) => pushLog(state, text, tone));
  rollRandomEvents(state, rs);
  deliverLetters(state);
  fireScriptedEvents(state);
  produce(state);

  state.standing = Math.max(0, Math.min(100, state.standing));
  if (state.standing <= 0) state.over = true;
  return state.dayLog;
}

function resolveCollections(state, rs) {
  const due = collectionsOn(state.day, rs);
  if (!due.length) {
    // Bins left out on a non-collection day are just clutter.
    for (const [key, bin] of Object.entries(state.bins)) {
      if (putOutTooEarly(bin, state.day)) {
        state.standing -= 1;
        pushLog(state, `The ${binLabel(bin, rs)} has been on the kerb for days.`, 'bad');
        bin.putOutDay = state.day; // only nag once
      }
    }
    return;
  }

  for (const [key, bin] of Object.entries(state.bins)) {
    const verdict = collectionVerdict(bin.type, bin, state.day, rs);
    const label = binLabel(bin, rs);
    const mine = !bin.neighbour;

    if (verdict.collected) {
      bin.items = [];
      state.standing += mine ? 2 : 3;
      pushLog(state, `${label} emptied.`, 'good');
      if (bin.neighbour && state.favour && state.favour.dueDay === state.day) {
        state.favour.status = 'done';
        state.standing += 4;
        pushLog(state, `${state.favour.from} will be very grateful.`, 'good');
        delete state.bins.neighbour;
        state.favour = null;
      }
      continue;
    }

    if (verdict.reason === 'not-due') continue;

    if (verdict.reason === 'missed-deadline') {
      state.standing -= mine ? 5 : 8;
      pushLog(state, `${label} missed — it wasn't out by 7am.`, 'bad');
      if (bin.neighbour && state.favour) {
        state.favour.status = 'failed';
        pushLog(state, `${state.favour.from} has seen the bin still on their drive.`, 'bad');
      }
    } else if (verdict.reason === 'lid-open') {
      state.standing -= 4;
      pushLog(state, `${label} refused — overflowing, lid won't close.`, 'bad');
    } else if (verdict.reason === 'contaminated') {
      state.standing -= 6;
      const names = verdict.items.map((i) => i.name).join(', ');
      pushLog(state, `${label} rejected. Contamination sticker: ${names}.`, 'bad');
    }
  }
}

function rollRandomEvents(state, rs) {
  const next = nextCollectionDay(state.day, rs);
  const black = state.bins.black;
  const ctx = {
    day: state.day,
    daysUntilCollection: next ? next.day - state.day : 99,
    nextCollection: next,
    blackBinLeftOutOvernight: !!(black && black.atKerb && black.items.length),
    binsLeftAtKerb: Object.values(state.bins).filter((b) => b.atKerb).length,
    pick: (arr) => arr[Math.floor(state.rand() * arr.length)],
  };

  for (const ev of randomEvents) {
    if (ev.when && !ev.when(ctx)) continue;
    if (state.rand() > ev.chance) continue;
    const built = ev.build(ctx);
    if (built.standing) state.standing += built.standing;
    state.messages.unshift({
      from: built.from, text: built.text, day: state.day, unread: true,
    });
    pushLog(state, built.text, built.standing ? 'bad' : 'info');
    break; // at most one random event a day, or it gets silly
  }
}

function deliverLetters(state) {
  for (const letter of lettersArrivingOn(state.day)) {
    state.inbox.unshift({ ...letter, unread: true, receivedDay: state.day });
    pushLog(state, `A letter from the council: "${letter.subject}".`, 'info');
  }
}

function fireScriptedEvents(state) {
  for (const ev of scripted) {
    if (ev.day !== state.day || state.firedEvents.has(ev.id)) continue;
    state.firedEvents.add(ev.id);

    if (ev.type === 'whatsapp-help' && !state.favour) {
      state.favour = {
        id: ev.id, from: ev.from, binType: ev.binType,
        dueDay: ev.dueDay, status: 'asked',
      };
    }
    if (ev.type === 'dump') {
      ev.items.forEach((id) => state.tray.push(makeItem(id)));
    }
    state.messages.unshift({
      from: ev.from, text: ev.text, day: state.day, unread: true,
      favourId: ev.type === 'whatsapp-help' ? ev.id : null,
    });
    pushLog(state, `${ev.from}: ${ev.text}`, 'info');
  }
}

function produce(state) {
  const weights = dailyProduction.base.map((w) => ({
    ...w,
    weight: w.weight + (state.productionWeights[w.id] || 0),
  }));
  const total = weights.reduce((n, w) => n + w.weight, 0);
  const count = 3 + Math.floor(state.rand() * 3);
  for (let n = 0; n < count; n++) {
    let r = state.rand() * total;
    for (const w of weights) {
      r -= w.weight;
      if (r <= 0) { state.tray.push(makeItem(w.id)); break; }
    }
  }
}

// ---------- helpers for the UI ----------

function pushLog(state, text, tone) {
  const entry = { day: state.day, text, tone };
  state.log.unshift(entry);
  if (state.dayLog) state.dayLog.push(entry);
}

export function binLabel(bin, rs) {
  const name = rs.bins[bin.type] ? rs.bins[bin.type].name : bin.type;
  return bin.neighbour ? `Neighbour's ${name.toLowerCase()}` : name;
}

export function dayName(day) {
  return DAY_NAMES[weekday(day)];
}

export function binFill(state, key, rs) {
  const bin = state.bins[key];
  return fillLevel(bin.type, bin.items, rs);
}

export { collectionsOn, nextCollectionDay, weekday, DAY_NAMES };
