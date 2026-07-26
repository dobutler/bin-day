// state.js
// The whole game lives in this store: the clock, the bins, the tray,
// letters, events, money and standing. It knows nothing about Phaser or
// the DOM — the scene and the UI both subscribe to it. Pure-ish and
// serialisable, so save games later are JSON.stringify(state.snapshot()).

import {
  activeRuleset,
  collectionsOn,
  collectionVerdict,
  correctBinsFor,
  lettersArrivingOn,
  weekday,
} from './systems/rules.js';
import { items as catalogue, dailyProduction } from './data/items.js';
import { events } from './data/events.js';
import { letters } from './data/letters.js';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const byId = Object.fromEntries(catalogue.map((i) => [i.id, i]));

// Categories a tip run can clear (glass joins once no bin accepts it).
const TIP_CATEGORIES = ['hazardous', 'electricals', 'bulky', 'textiles'];

let uid = 0;
function makeItem(id) {
  const def = byId[id];
  return { uid: ++uid, ...def };
}

function makeBinState() {
  return { items: [], atKerb: false, putOutAt: null, sticker: false };
}

export const state = {
  day: 0,
  hour: 8,
  speed: 1, // 0 paused, 1 = 1h/sec, 5 = 5h/sec
  money: 100,
  standing: 50,
  tray: [],
  tipPile: [],
  bins: {
    black: makeBinState(),
    blue: makeBinState(),
    green: makeBinState(),
    caddy: makeBinState(),
  },
  neighbourTask: null, // { id, from, binId, dueDay, out, putOutAt, done }
  unreadLetters: [],
  readLetters: [],
  firedEvents: new Set(),
  paidSubscriptions: {}, // e.g. { green: true }
  rulesVersionSeen: 1,
};

// ---------- pub/sub ----------

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(type, payload) {
  for (const fn of listeners) fn(type, payload, state);
}

// ---------- derived rules ----------

let rulesCache = { key: '', rs: null };
export function getRules() {
  const key = `${state.day}:${JSON.stringify(state.paidSubscriptions)}`;
  if (rulesCache.key !== key) {
    const rs = activeRuleset(state.day);
    for (const [binId, paid] of Object.entries(state.paidSubscriptions)) {
      if (paid && rs.bins[binId]?.subscription) rs.bins[binId].subscription.subscribed = true;
    }
    rulesCache = { key, rs };
  }
  return rulesCache.rs;
}

export function clockLabel() {
  return `Day ${state.day + 1} · ${WEEKDAYS[weekday(state.day)]}\n${String(state.hour).padStart(2, '0')}:00`;
}

export function binFill(binId) {
  return state.bins[binId].items.reduce((s, i) => s + i.volume, 0);
}

export function lidOpen(binId) {
  return binFill(binId) > getRules().bins[binId].capacity;
}

export function nextCollections(horizonDays = 14) {
  const out = [];
  for (let d = state.day; d < state.day + horizonDays; d++) {
    const rs = activeRuleset(d);
    const bins = collectionsOn(d, rs);
    if (bins.length) out.push({ day: d, weekday: WEEKDAYS[weekday(d)], bins });
    if (out.length >= 3) break;
  }
  return out;
}

// ---------- player actions ----------

export function setSpeed(s) {
  state.speed = s;
  emit('change');
}

export function toggleBin(binId) {
  const b = state.bins[binId];
  b.atKerb = !b.atKerb;
  b.putOutAt = b.atKerb ? state.day * 24 + state.hour : null;
  emit('change');
}

export function toggleNeighbourBin() {
  const t = state.neighbourTask;
  if (!t || t.done) return;
  t.out = !t.out;
  t.putOutAt = t.out ? state.day * 24 + state.hour : null;
  emit('change');
}

export function assignItem(itemUid, dest) {
  const idx = state.tray.findIndex((i) => i.uid === itemUid);
  if (idx === -1) return;
  const [item] = state.tray.splice(idx, 1);
  if (dest === 'tip') state.tipPile.push(item);
  else state.bins[dest].items.push(item);
  emit('change');
}

export function tipRun() {
  if (state.hour < 8 || state.hour > 16) {
    emit('toast', { kind: 'bad', text: 'The tip is shut. It keeps council hours, naturally.' });
    return;
  }
  const rs = getRules();
  const clearable = (item) =>
    TIP_CATEGORIES.includes(item.category) || correctBinsFor(item.category, rs).length === 0;
  const cleared = state.tipPile.filter(clearable).length +
    state.tray.filter(clearable).length;
  if (!cleared) {
    emit('toast', { kind: 'sys', text: 'Nothing worth the queue at the tip today.' });
    return;
  }
  state.tipPile = state.tipPile.filter((i) => !clearable(i));
  state.tray = state.tray.filter((i) => !clearable(i));
  // A tip run eats three hours of your day. That is generous.
  for (let i = 0; i < 3; i++) tick(true);
  state.standing += 1;
  emit('toast', {
    kind: 'good',
    text: `Tip run done. ${cleared} item${cleared === 1 ? '' : 's'} responsibly disposed of. Three hours of your life, gone.`,
  });
  emit('change');
}

export function paySubscription(binId, cost) {
  if (state.money < cost) {
    emit('toast', { kind: 'bad', text: 'You cannot afford the garden waste subscription. The grass grows regardless.' });
    return;
  }
  state.money -= cost;
  state.paidSubscriptions[binId] = true;
  emit('toast', { kind: 'good', text: 'Garden waste subscription active. The green bin will be emptied once more.' });
  emit('change');
}

export function markLettersRead() {
  state.readLetters.push(...state.unreadLetters);
  state.unreadLetters = [];
  emit('change');
}

export function allLetters() {
  return letters.filter(
    (l) => state.readLetters.includes(l.id) || state.unreadLetters.includes(l.id)
  );
}

export function acceptNeighbourTask(ev) {
  state.neighbourTask = {
    id: ev.id, from: ev.from, binId: ev.binId, dueDay: ev.dueDay,
    out: false, putOutAt: null, done: false,
  };
  emit('toast', { kind: 'sys', text: `You said yes. Their ${ev.binId} bin needs to be out by 7am on ${WEEKDAYS[weekday(ev.dueDay)]}.` });
  emit('change');
}

export function declineNeighbourTask(ev) {
  state.standing -= 1;
  emit('toast', { kind: 'sys', text: 'You left them on read. The street remembers.' });
  emit('change');
}

// ---------- the clock ----------

let timer = null;
export function start() {
  stop();
  timer = setInterval(() => {
    if (state.speed === 0) return;
    for (let i = 0; i < state.speed; i++) tick();
  }, 1000);
}
export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function tick(silent = false) {
  state.hour += 1;
  if (state.hour >= 24) {
    state.hour = 0;
    state.day += 1;
  }
  const { day, hour } = state;

  if (hour === 7) resolveCollections();
  if (hour === 8 && !silent) produceItems();
  if (hour === 9) deliverLetters();
  fireEvents(day, hour);

  emit('change');
}

// ---------- daily systems ----------

function produceItems() {
  const weights = dailyProduction.base;
  const total = weights.reduce((s, w) => s + w.weight, 0);
  const n = 2 + Math.floor(Math.random() * 3); // 2–4 items a day
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    for (const w of weights) {
      r -= w.weight;
      if (r <= 0) { state.tray.push(makeItem(w.id)); break; }
    }
  }
}

function deliverLetters() {
  for (const letter of lettersArrivingOn(state.day)) {
    if (state.unreadLetters.includes(letter.id) || state.readLetters.includes(letter.id)) continue;
    state.unreadLetters.push(letter.id);
    emit('toast', { kind: 'sys', text: `A letter from Fenborough District Council has arrived. It looks official.` });
    emit('letter-arrived', letter);
  }
}

function fireEvents(day, hour) {
  for (const ev of events) {
    if (ev.day !== day || ev.hour !== hour || state.firedEvents.has(ev.id)) continue;
    state.firedEvents.add(ev.id);
    if (ev.type === 'whatsapp-help') {
      emit('whatsapp-ask', ev);
    } else if (ev.type === 'dump') {
      for (const id of ev.items) state.tray.push(makeItem(id));
      emit('whatsapp-msg', ev);
    } else {
      emit('whatsapp-msg', ev);
    }
  }
}

const REASONS = {
  'missed-deadline': (bin) => `The ${bin} bin was not out by 7am. The lorry waits for no one.`,
  'lid-open': (bin) => `The ${bin} bin was refused: lid not closed. No side waste, no propped lids.`,
  contaminated: (bin) => `The ${bin} bin got a red sticker: contamination found. It was not emptied.`,
};

function resolveCollections() {
  const rs = getRules();
  const due = collectionsOn(state.day, rs);
  if (!due.length && !(state.neighbourTask && state.neighbourTask.dueDay === state.day)) return;

  // Foxes first: bins out before 6pm the previous evening tempt fate.
  for (const binId of due) {
    const b = state.bins[binId];
    if (b.atKerb && b.putOutAt != null && b.putOutAt <= (state.day - 1) * 24 + 17 && Math.random() < 0.35) {
      state.standing -= 1;
      emit('toast', { kind: 'bad', text: `Foxes have been at the ${binId} bin overnight. The drive is a crime scene.` });
    }
  }

  let anyCollected = false;
  for (const binId of due) {
    const b = state.bins[binId];
    if (!rs.bins[binId].active) continue;
    const verdict = collectionVerdict(
      binId,
      { atKerb: b.atKerb, putOutAt: b.putOutAt, lidOpen: lidOpen(binId), items: b.items },
      state.day,
      rs
    );
    if (verdict.collected) {
      b.items = [];
      b.sticker = false;
      state.standing += 2;
      anyCollected = true;
      emit('toast', { kind: 'good', text: `${rs.bins[binId].name} emptied. A small, tidy victory.` });
    } else if (verdict.reason === 'contaminated') {
      b.sticker = true;
      state.standing -= 5;
      // Offending items are fished out and returned to your tray in shame.
      b.items = b.items.filter((i) => !verdict.items.includes(i));
      state.tray.push(...verdict.items);
      emit('toast', { kind: 'bad', text: REASONS.contaminated(binId) + ` (${verdict.items.map((i) => i.name).join(', ')})` });
    } else if (verdict.reason !== 'not-due') {
      state.standing -= 3;
      emit('toast', { kind: 'bad', text: REASONS[verdict.reason](binId) });
    }
  }

  // Neighbour's bin.
  const t = state.neighbourTask;
  if (t && !t.done && t.dueDay === state.day) {
    t.done = true;
    if (t.out && t.putOutAt <= state.day * 24 + rs.rota.deadlineHour) {
      state.standing += 5;
      emit('whatsapp-msg', { from: t.from, text: 'You absolute legend, thank you!! Wine on the doorstep when we\'re back 🍷' });
    } else {
      state.standing -= 3;
      emit('whatsapp-msg', { from: t.from, text: 'Hey… did the bin go out? No worries if not. (There are worries.)' });
    }
  }

  if (anyCollected) emit('lorry');
}
