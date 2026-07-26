// ui.js
// Everything outside the canvas: HUD, rota, bin panel, sorting tray,
// the phone toast stack and the council letter overlay. Plain DOM,
// re-rendered from state on every change — fine at this scale.

import {
  state, subscribe, getRules, clockLabel, binFill, lidOpen, nextCollections,
  setSpeed, toggleBin, assignItem, tipRun, paySubscription, markLettersRead,
  allLetters, acceptNeighbourTask, declineNeighbourTask,
} from '../game/state.js';
import { correctBinsFor } from '../game/systems/rules.js';

const $ = (sel) => document.querySelector(sel);

const BIN_HEX = { black: '#2b2b2b', blue: '#2b6cb0', green: '#2f855a', caddy: '#7b5e3b' };

export function bootUI() {
  subscribe((type, payload) => {
    if (type === 'change') render();
    if (type === 'toast') toast(payload.kind, payload.text);
    if (type === 'whatsapp-msg') waMessage(payload);
    if (type === 'whatsapp-ask') waAsk(payload);
    if (type === 'letter-arrived') { /* badge handled by render */ }
  });
  $('#letter-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'letter-overlay') closeLetters();
  });
  render();
}

// ---------- render ----------

function render() {
  $('#clock').textContent = clockLabel();
  renderHud();
  renderRota();
  renderBins();
  renderTray();
  renderTip();
}

function renderHud() {
  const standingClass = state.standing >= 50 ? 'good' : state.standing >= 30 ? '' : 'bad';
  $('#hud').innerHTML = `
    <div class="stat"><div class="label">Neighbourhood standing</div>
      <div class="value ${standingClass}">${state.standing}</div></div>
    <div class="stat"><div class="label">Money</div>
      <div class="value">£${state.money}</div></div>
    <div class="controls">
      <button data-speed="0" class="quiet ${state.speed === 0 ? 'active-speed' : ''}">⏸</button>
      <button data-speed="1" class="quiet ${state.speed === 1 ? 'active-speed' : ''}">▶</button>
      <button data-speed="5" class="quiet ${state.speed === 5 ? 'active-speed' : ''}">⏩</button>
      <button id="letters-btn">Letters ✉
        ${state.unreadLetters.length ? `<span class="badge">${state.unreadLetters.length}</span>` : ''}
      </button>
    </div>`;
  $('#hud').querySelectorAll('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
  $('#letters-btn').addEventListener('click', openLetters);
}

function renderRota() {
  const rows = nextCollections()
    .map(
      (c) => `<div class="rota-row">
        <span>${c.bins.map((b) => getRules().bins[b].name).join(' + ')}</span>
        <span class="when">${c.day === state.day ? 'today' : c.weekday} (day ${c.day + 1})</span>
      </div>`
    )
    .join('');
  $('#rota').innerHTML = `<h2>Upcoming collections</h2>${rows || '<p class="empty">Nothing scheduled. Suspicious.</p>'}`;
}

function renderBins() {
  const rs = getRules();
  const rows = Object.entries(rs.bins)
    .filter(([, bin]) => bin.active)
    .map(([id, bin]) => {
      const fill = binFill(id);
      const over = fill > bin.capacity;
      const pct = Math.min(100, (fill / bin.capacity) * 100);
      const b = state.bins[id];
      const sub = bin.subscription && !bin.subscription.subscribed
        ? `<span class="tag sub">unpaid £${bin.subscription.costPerYear}/yr</span>` : '';
      return `<div class="bin-row">
        <div class="bin-head">
          <span class="bin-dot" style="background:${BIN_HEX[id]}"></span>
          <span class="bin-name">${bin.name}</span>
          ${b.sticker ? '<span class="tag sticker">stickered</span>' : ''} ${sub}
          <span class="bin-loc">${b.atKerb ? 'at kerb' : 'on drive'}</span>
        </div>
        <div class="fill"><div class="${over ? 'over' : ''}" style="width:${pct}%"></div></div>
        <div style="font-size:12px;color:var(--ink-soft)">
          ${fill}/${bin.capacity} ${over ? '· lid won’t close!' : ''}
          · takes: ${bin.accepts.length ? bin.accepts.join(', ') : 'nothing yet'}
        </div>
        <button class="quiet" data-togglebin="${id}" style="margin-top:5px">
          ${b.atKerb ? 'Bring in' : 'Wheel out'}
        </button>
      </div>`;
    })
    .join('');
  $('#bins-panel').innerHTML = `<h2>Your bins</h2>${rows}`;
  $('#bins-panel').querySelectorAll('[data-togglebin]').forEach((b) =>
    b.addEventListener('click', () => toggleBin(b.dataset.togglebin)));
}

function renderTray() {
  const rs = getRules();
  const chips = state.tray
    .map((item) => {
      const dests = Object.entries(rs.bins)
        .filter(([, bin]) => bin.active)
        .map(
          ([id, bin]) =>
            `<button data-item="${item.uid}" data-dest="${id}"
              style="background:${BIN_HEX[id]}" title="${bin.name}">${id}</button>`
        )
        .join('');
      const nowhere = correctBinsFor(item.category, rs).length === 0;
      return `<div class="chip">
        ${item.name}
        ${item.note ? `<span class="note">${item.note}</span>` : ''}
        ${nowhere ? `<span class="note">No bin will take this. Tip pile?</span>` : ''}
        <div class="dests">${dests}
          <button class="quiet" data-item="${item.uid}" data-dest="tip">tip pile</button>
        </div>
      </div>`;
    })
    .join('');
  $('#tray-panel').innerHTML = `<h2>Kitchen (to sort: ${state.tray.length})</h2>
    ${chips || '<p class="empty">Nothing to sort. Enjoy it while it lasts.</p>'}`;
  $('#tray-panel').querySelectorAll('[data-item]').forEach((b) =>
    b.addEventListener('click', () => assignItem(Number(b.dataset.item), b.dataset.dest)));
}

function renderTip() {
  $('#tip-panel').innerHTML = `<h2>Tip pile (${state.tipPile.length})</h2>
    ${state.tipPile.length
      ? `<p style="font-size:13px;margin:4px 0">${state.tipPile.map((i) => i.name).join(', ')}</p>`
      : '<p class="empty">Empty. The garage thanks you.</p>'}
    <button data-tiprun>Drive to the tip (3 hours)</button>`;
  $('#tip-panel').querySelector('[data-tiprun]').addEventListener('click', tipRun);
}

// ---------- phone ----------

function toast(kind, text) {
  const el = document.createElement('div');
  el.className = `wa sys ${kind === 'bad' ? 'bad' : kind === 'good' ? 'good' : ''}`;
  el.textContent = text;
  pushPhone(el, 7000);
}

function waMessage(ev) {
  const el = document.createElement('div');
  el.className = 'wa';
  el.innerHTML = `<div class="from">${ev.from}</div>${ev.text}`;
  pushPhone(el, 10000);
}

function waAsk(ev) {
  const el = document.createElement('div');
  el.className = 'wa';
  el.innerHTML = `<div class="from">${ev.from}</div>${ev.text}
    <div class="acts"><button data-yes>Of course!</button>
    <button class="quiet" data-no>Leave on read</button></div>`;
  el.querySelector('[data-yes]').addEventListener('click', () => { acceptNeighbourTask(ev); el.remove(); });
  el.querySelector('[data-no]').addEventListener('click', () => { declineNeighbourTask(ev); el.remove(); });
  pushPhone(el, null); // sticks until answered
}

function pushPhone(el, ttl) {
  const stack = $('#phone-stack');
  stack.appendChild(el);
  while (stack.children.length > 4) stack.firstChild.remove();
  if (ttl) setTimeout(() => el.remove(), ttl);
}

// ---------- the letter ----------

let letterIndex = 0;

function openLetters() {
  const all = allLetters();
  if (!all.length) { toast('sys', 'No post. The council is biding its time.'); return; }
  letterIndex = all.length - 1; // open the most recent letter
  markLettersRead();
  showLetter();
  $('#letter-overlay').classList.remove('hidden');
}

function closeLetters() {
  $('#letter-overlay').classList.add('hidden');
}

function describeOp(op) {
  const rs = getRules();
  const binName = (path) => {
    const m = path.match(/^bins\.(\w+)/);
    return m ? (rs.bins[m[1]]?.name || m[1]) : path;
  };
  if (op.path.endsWith('.subscription') && op.op === 'set')
    return `${binName(op.path)}: garden waste becomes a paid subscription (£${op.value.costPerYear}/year).`;
  if (op.path.endsWith('.accepts') && op.op === 'remove')
    return `${binName(op.path)}: no longer accepts ${op.value}.`;
  if (op.path.endsWith('.accepts') && op.op === 'add')
    return `${binName(op.path)}: now accepts ${op.value}.`;
  if (op.path.endsWith('.active'))
    return `${binName(op.path)}: ${op.value ? 'introduced' : 'withdrawn'}.`;
  if (op.path === 'rota.collections' && op.op === 'add')
    return `New collection scheduled: ${op.value.bins.join(', ')}.`;
  if (op.path === 'rota.holidayShifts')
    return `Collections between day ${op.value.fromDay + 1} and day ${op.value.toDay + 1} move ${op.value.shiftDays} day later.`;
  return `${op.op} ${op.path}`;
}

function showLetter() {
  const all = allLetters();
  const letter = all[letterIndex];
  const effects = letter.ops.map((op) => `<li>${describeOp(op)}</li>`).join('');
  const gardenSub = letter.id === 'garden-waste-charge' && !state.paidSubscriptions.green
    ? `<button data-subscribe>Subscribe now (£60)</button>` : '';

  $('#letter-paper').innerHTML = `
    <div class="letterhead">
      <div class="name">Fenborough District Council</div>
      <div class="dept">Waste &amp; Environmental Services · Working for you, apparently</div>
    </div>
    <div style="font-size:12.5px;color:var(--ink-soft)">Ref: FDC/WES/${letter.id.toUpperCase()} · Delivered day ${letter.arrivesDay + 1} · Effective day ${letter.effectiveDay + 1}</div>
    <div class="letter-subject">Re: ${letter.subject}</div>
    <div class="letter-body">${letter.body}</div>
    <div class="letter-effects">
      <h3>What this means for you</h3>
      <ul>${effects}</ul>
    </div>
    <div class="letter-foot">
      <button class="quiet" data-prev ${letterIndex === 0 ? 'disabled' : ''}>← Older</button>
      <button class="quiet" data-next ${letterIndex >= all.length - 1 ? 'disabled' : ''}>Newer →</button>
      <span class="spacer"></span>
      ${gardenSub}
      <button data-close>File in the drawer</button>
    </div>`;

  $('#letter-paper').querySelector('[data-close]').addEventListener('click', closeLetters);
  const prev = $('#letter-paper').querySelector('[data-prev]');
  const next = $('#letter-paper').querySelector('[data-next]');
  prev.addEventListener('click', () => { if (letterIndex > 0) { letterIndex--; showLetter(); } });
  next.addEventListener('click', () => { if (letterIndex < all.length - 1) { letterIndex++; showLetter(); } });
  const sub = $('#letter-paper').querySelector('[data-subscribe]');
  if (sub) sub.addEventListener('click', () => { paySubscription('green', 60); showLetter(); });
}
