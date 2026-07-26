// state.js
// Game state and the day-advance pipeline. No Phaser in here — the scene and
// the HTML overlay both read from this and send intents back.

import { items as catalogue, dailyProduction } from '../data/items.js';
import { scripted, random as randomEvents } from '../data/events.js';
import { defaultScheme, binNameFor, colourOf } from '../data/palette.js';
import { newStreet, decideStreet, resolveStreet } from './street.js';
import {
  activeRuleset, collectionsOn, nextCollectionDay, lettersArrivingOn,
  collectionVerdict, fillLevel, weekday, DAY_NAMES, putOutTooEarly,
} from './rules.js';

// Deterministic PRNG so a seed reproduces a whole run.
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
  return { ...itemById[id], uid: `i${uid++}` };
}

// Time costs, gathered in one place so they are easy to tune.
export const TIME_COST = {
  missedCollection: 8,
  tipRun: 12,
  tidyTippedBin: 4,
  getDressed: 2,
  binMuddle: 6,
  dailyRecovery: 3,
};

export function newGame(seed = 20260726, setup = {}) {
  const state = {
    day: 0,
    seed,
    rand: mulberry32(seed),

    // The three bars.
    standing: 60,   // community standing, 0–100
    binTime: 100,   // your own time, drained by unplanned bin work
    // street chaos lives on state.street.chaos

    money: 150,
    scheme: { ...structuredClone(defaultScheme), ...(setup.scheme || {}) },
    houseNumber: setup.houseNumber || '40',
    labelled: setup.labelled !== undefined ? setup.labelled : true,

    tray: [],
    bins: {},
    subscriptions: {},
    inbox: [],
    messages: [],
    favour: null,
    log: [],
    firedEvents: new Set(),
    street: newStreet(),
    evening: freshEvening(),
    over: false,
  };
  syncBins(state);
  produce(state);
  return state;
}

function freshEvening() {
  return { neighboursOut: false, peeked: false, dressed: false, caught: false };
}

export function rulesFor(state) {
  return activeRuleset(state.day, state.subscriptions);
}

function syncBins(state) {
  const rs = rulesFor(state);
  for (const [type, bin] of Object.entries(rs.bins)) {
    if (!bin.active || state.bins[type]) continue;
    state.bins[type] = {
      type, items: [], atKerb: false, putOutDay: -99, putOutHour: 0,
      tipped: false, grime: 0, missingUntil: -1,
    };
  }
}

// ---------- naming, driven by the player's colour scheme ----------

export function binLabel(bin, rs) {
  const name = binNameFor(bin.type, bin.scheme || {});
  return bin.neighbour ? `Neighbour's ${name.toLowerCase()}` : name;
}

export function nameOf(state, binType) {
  return binNameFor(binType, state.scheme);
}

export function colourFor(state, binType) {
  const entry = state.scheme[binType] || defaultScheme[binType];
  return colourOf(entry.colour).hex;
}

// Council letters are written with {black} {blue} {green} {caddy} placeholders.
export function fillTemplate(state, text) {
  return text.replace(/\{(black|blue|green|caddy)\}/g, (_, id) =>
    nameOf(state, id).toLowerCase()
  );
}

export function isAvailable(state, key) {
  const bin = state.bins[key];
  return !!bin && bin.missingUntil < state.day;
}

// ---------- player intents ----------

export function binItem(state, itemUid, binKey) {
  if (!isAvailable(state, binKey)) return false;
  const idx = state.tray.findIndex((i) => i.uid === itemUid);
  if (idx === -1) return false;
  const [item] = state.tray.splice(idx, 1);
  state.bins[binKey].items.push(item);
  return true;
}

export function unbinItem(state, binKey, itemUid) {
  const bin = state.bins[binKey];
  if (!bin) return false;
  const idx = bin.items.findIndex((i) => i.uid === itemUid);
  if (idx === -1) return false;
  state.tray.push(bin.items.splice(idx, 1)[0]);
  return true;
}

// Wheeling a bin out is the one action the neighbours can see you doing.
export function toggleKerb(state, binKey) {
  const bin = state.bins[binKey];
  if (!bin) return { ok: false, why: 'No such bin.' };
  if (!isAvailable(state, binKey))
    return { ok: false, why: 'That bin is on somebody else\'s drive.' };

  bin.atKerb = !bin.atKerb;
  if (!bin.atKerb) return { ok: true };

  bin.putOutDay = state.day;
  bin.putOutHour = 18;

  // Caught in your pyjamas.
  if (state.evening.neighboursOut && !state.evening.dressed && !state.evening.caught) {
    state.evening.caught = true;
    state.standing -= 2;
    pushLog(state, 'Someone was out there. In your pyjamas. Again.', 'bad');
    return { ok: true, caught: true };
  }
  return { ok: true };
}

// Look before you go out. Free, once a day.
export function peekWindow(state) {
  state.evening.peeked = true;
  return state.evening.neighboursOut;
}

export function getDressed(state) {
  if (state.evening.dressed) return { ok: false, why: 'Already dressed.' };
  if (state.binTime < TIME_COST.getDressed)
    return { ok: false, why: 'No time. The bins have taken it all.' };
  state.evening.dressed = true;
  spendTime(state, TIME_COST.getDressed);
  return { ok: true };
}

export function buySubscription(state, binType) {
  const rs = rulesFor(state);
  const sub = rs.bins[binType] && rs.bins[binType].subscription;
  if (!sub || sub.subscribed) return { ok: false, why: 'Nothing to buy.' };
  if (state.money < sub.costPerYear) return { ok: false, why: 'Not enough money.' };
  state.money -= sub.costPerYear;
  state.subscriptions[binType] = true;
  return { ok: true };
}

export const WASH_COST = 4;

export function washBin(state, binKey) {
  const bin = state.bins[binKey];
  if (!bin) return { ok: false, why: 'No such bin.' };
  if (bin.grime < 0.05) return { ok: false, why: 'That one is already clean.' };
  if (state.money < WASH_COST) return { ok: false, why: `You need £${WASH_COST}.` };
  state.money -= WASH_COST;
  bin.grime = 0;
  return { ok: true };
}

export function tidyBin(state, binKey) {
  const bin = state.bins[binKey];
  if (!bin || !bin.tipped) return { ok: false, why: 'Nothing to right.' };
  bin.tipped = false;
  spendTime(state, TIME_COST.tidyTippedBin);
  return { ok: true };
}

export function tipRun(state) {
  if (weekday(state.day) < 5)
    return { ok: false, why: 'The tip queue is only worth it at the weekend.' };
  const takeable = ['bulky', 'hazardous', 'electricals', 'textiles', 'glass', 'garden', 'general'];
  const before = state.tray.length;
  state.tray = state.tray.filter((i) => !takeable.includes(i.category));
  const removed = before - state.tray.length;
  if (!removed) return { ok: false, why: 'Nothing the tip would take.' };
  spendTime(state, TIME_COST.tipRun);
  return { ok: true, removed };
}

export function answerFavour(state, accept) {
  if (!state.favour || state.favour.status !== 'asked') return;
  if (accept) {
    state.favour.status = 'accepted';
    state.bins.neighbour = {
      type: state.favour.binType, neighbour: true, items: [],
      atKerb: false, putOutDay: -99, putOutHour: 0,
      tipped: false, grime: 0, missingUntil: -1,
    };
  } else {
    state.favour.status = 'declined';
    state.standing -= 2;
    pushLog(state, `You told ${state.favour.from} you couldn't help.`, 'bad');
    state.favour = null;
  }
}

function spendTime(state, n) {
  state.binTime = Math.max(0, state.binTime - n);
}

// ---------- day advance ----------

export function advanceDay(state) {
  const rsTonight = rulesFor(state);
  decideStreet(state, rsTonight, state.day + 1);

  state.day += 1;
  state.dayLog = [];
  const rs = rulesFor(state);

  syncBins(state);
  resolveCollections(state, rs);
  resolveStreet(state, rs, (text, tone) => pushLog(state, text, tone));
  resolveKerbClutter(state, rs);
  rollRandomEvents(state, rs);
  deliverLetters(state);
  fireScriptedEvents(state);
  produce(state);
  recoverTime(state);

  state.evening = freshEvening();
  state.evening.neighboursOut = state.rand() < 0.45;

  state.standing = Math.max(0, Math.min(100, state.standing));
  if (state.standing <= 0) state.over = true;
  return state.dayLog;
}

function resolveCollections(state, rs) {
  const due = collectionsOn(state.day, rs);
  if (!due.length) return;

  for (const [key, bin] of Object.entries(state.bins)) {
    const verdict = collectionVerdict(bin.type, bin, state.day, rs);
    if (verdict.reason === 'not-due') continue;

    const label = binLabel({ ...bin, scheme: state.scheme }, rs);
    const mine = !bin.neighbour;

    if (verdict.collected) {
      bin.items = [];
      bin.grime = Math.min(1, bin.grime + (bin.type === 'blue' ? 0.08 : 0.18));
      state.standing += mine ? 2 : 3;
      pushLog(state, `${label} emptied.`, 'good');
      maybeMuddle(state, key, bin, label);

      if (bin.neighbour && state.favour && state.favour.dueDay === state.day) {
        state.favour.status = 'done';
        state.standing += 4;
        pushLog(state, `${state.favour.from} will be very grateful.`, 'good');
        delete state.bins.neighbour;
        state.favour = null;
      }
      continue;
    }

    if (verdict.reason === 'missed-deadline') {
      state.standing -= mine ? 5 : 8;
      spendTime(state, TIME_COST.missedCollection);
      pushLog(state, `${label} missed — it wasn't out by 7am. Another fortnight of it.`, 'bad');
      if (bin.neighbour && state.favour) {
        state.favour.status = 'failed';
        pushLog(state, `${state.favour.from} has seen the bin still on their drive.`, 'bad');
      }
    } else if (verdict.reason === 'tipped') {
      state.standing -= 3;
      state.street.chaos += 1;
      pushLog(state, `${label} was on its side. They drove past it.`, 'bad');
    } else if (verdict.reason === 'lid-open') {
      state.standing -= 4;
      spendTime(state, TIME_COST.missedCollection);
      pushLog(state, `${label} refused — overflowing, lid won't close.`, 'bad');
    } else if (verdict.reason === 'contaminated') {
      state.standing -= 6;
      spendTime(state, TIME_COST.missedCollection);
      pushLog(state, `${label} rejected. Contamination sticker: ${verdict.items.map((i) => i.name).join(', ')}.`, 'bad');
    }
  }
}

// Unlabelled bins wander. Everyone's bin looks the same on collection day.
function maybeMuddle(state, key, bin, label) {
  if (state.labelled || bin.neighbour) return;
  if (state.rand() > 0.14) return;
  const days = 1 + Math.floor(state.rand() * 3);
  bin.missingUntil = state.day + days;
  bin.atKerb = false;
  state.street.chaos += 2;
  spendTime(state, TIME_COST.binMuddle);
  pushLog(state, `Your ${label.toLowerCase()} has gone. No house number on it, so it could be anywhere on the road.`, 'bad');
  state.messages.unshift({
    from: 'Street WhatsApp group', day: state.day, unread: true,
    text: 'Has anyone got a spare bin on their drive? There is one here with no number on it and I do not know whose it is.',
  });
}

// Bins left on the kerb long after collection. The street notices.
function resolveKerbClutter(state, rs) {
  for (const [key, bin] of Object.entries(state.bins)) {
    if (!bin.atKerb) continue;
    const soon = collectionsOn(state.day, rs).includes(bin.type) ||
                 collectionsOn(state.day + 1, rs).includes(bin.type);
    if (soon) continue;

    const daysOut = state.day - bin.putOutDay;
    if (daysOut < 2) continue;

    state.standing -= 1;
    // The street only gets *more* confused for the first few days; after
    // that your bin is simply part of the scenery and they judge you quietly.
    if (daysOut <= 5) state.street.chaos += 1;
    const label = binLabel({ ...bin, scheme: state.scheme }, rs);

    if (daysOut === 3) {
      state.messages.unshift({
        from: 'Street WhatsApp group', day: state.day, unread: true,
        text: `Not naming names but there is a ${label.toLowerCase()} that has been on the pavement since collection day. It is a trip hazard. Some of us have prams.`,
      });
      pushLog(state, `The group chat has noticed your ${label.toLowerCase()}.`, 'bad');
    } else if (daysOut <= 6 || daysOut % 7 === 0) {
      pushLog(state, `${label} still on the kerb, ${daysOut} days on.`, 'bad');
    }
  }
}

function rollRandomEvents(state, rs) {
  const next = nextCollectionDay(state.day, rs);
  const black = state.bins.black;
  const grimy = Object.values(state.bins).some((b) => b.grime > 0.6);
  const ctx = {
    day: state.day,
    daysUntilCollection: next ? next.day - state.day : 99,
    nextCollection: next,
    blackBinLeftOutOvernight: !!(black && black.atKerb && black.items.length),
    grimyBins: grimy,
    binsAtKerb: Object.values(state.bins).filter((b) => b.atKerb).length,
    binsLeftAtKerb: Object.values(state.bins).filter((b) => b.atKerb).length,
    pick: (arr) => arr[Math.floor(state.rand() * arr.length)],
  };

  for (const ev of randomEvents) {
    if (ev.when && !ev.when(ctx)) continue;
    if (state.rand() > ev.chance) continue;
    const built = ev.build(ctx);

    if (built.effect === 'gale') applyGale(state, rs);
    if (built.standing) state.standing += built.standing;

    state.messages.unshift({
      from: built.from, text: built.text, day: state.day, unread: true,
    });
    pushLog(state, built.text, built.standing ? 'bad' : 'info');
    break;
  }
}

// A proper gale. Bins on the kerb go over and the contents go everywhere.
function applyGale(state, rs) {
  let tipped = 0;
  for (const [key, bin] of Object.entries(state.bins)) {
    if (!bin.atKerb || state.rand() > 0.55) continue;
    bin.tipped = true;
    tipped += 1;
    // Roughly half the contents end up back in your hands.
    const spill = Math.ceil(bin.items.length / 2);
    for (let n = 0; n < spill; n++) {
      const item = bin.items.pop();
      if (item) state.tray.push(item);
    }
  }
  if (tipped) {
    state.street.chaos += tipped;
    pushLog(state, `${tipped} of your bins went over in the night. Rubbish down the road.`, 'bad');
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
    if (ev.type === 'dump') ev.items.forEach((id) => state.tray.push(makeItem(id)));

    state.messages.unshift({
      from: ev.from, text: ev.text, day: state.day, unread: true,
      favourId: ev.type === 'whatsapp-help' ? ev.id : null,
    });
    pushLog(state, `${ev.from}: ${ev.text}`, 'info');
  }
}

function produce(state) {
  const total = dailyProduction.base.reduce((n, w) => n + w.weight, 0);
  const count = 3 + Math.floor(state.rand() * 3);
  for (let n = 0; n < count; n++) {
    let r = state.rand() * total;
    for (const w of dailyProduction.base) {
      r -= w.weight;
      if (r <= 0) { state.tray.push(makeItem(w.id)); break; }
    }
  }
}

function recoverTime(state) {
  state.binTime = Math.min(100, state.binTime + TIME_COST.dailyRecovery);
  // With no time left, the bins are running your life and it shows.
  if (state.binTime === 0) {
    state.standing -= 2;
    pushLog(state, 'You have spent the whole week on rubbish. It shows.', 'bad');
  }
}

// ---------- helpers for the UI ----------

function pushLog(state, text, tone) {
  const entry = { day: state.day, text, tone };
  state.log.unshift(entry);
  if (state.dayLog) state.dayLog.push(entry);
}

export function dayName(day) {
  return DAY_NAMES[weekday(day)];
}

export function binFill(state, key, rs) {
  const bin = state.bins[key];
  return fillLevel(bin.type, bin.items, rs);
}

export { collectionsOn, nextCollectionDay, weekday, DAY_NAMES, putOutTooEarly };
