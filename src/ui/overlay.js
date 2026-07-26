// overlay.js
// The paperwork half of the game: calendar, tray, post, phone. Plain DOM on
// top of the canvas, because HTML is simply better at letters and lists than
// a game canvas is.

import { bus } from '../bus.js';
import {
  advanceDay, binItem, unbinItem, toggleKerb, rulesFor, answerFavour,
  buySubscription, tipRun, dayName, nameOf, fillTemplate, isAvailable,
  peekWindow, getDressed, washBin, tidyBin, WASH_COST,
  flattenItem, checkForWildlife, flyTip,
} from '../game/systems/state.js';
import {
  collectionsOn, nextCollectionDay, correctBinsFor, DAY_NAMES, weekday,
  allLetters,
} from '../game/systems/rules.js';
import { colourOf, defaultScheme } from '../game/data/palette.js';

let state;
let selectedUid = null;
let tab = 'tray';

export function mountOverlay(gameState, root) {
  state = gameState;
  root.innerHTML = template();
  wire(root);
  bus.on('bin-clicked', (key) => onBinClicked(key));
  render();
}

function template() {
  return `
    <header class="hud">
      <div class="hud-date"><strong id="hud-day"></strong><span id="hud-week"></span></div>
      <div class="hud-next" id="hud-next"></div>
      <div class="hud-meters">
        <div class="meter"><label>Community standing</label><div class="bar"><i id="bar-standing"></i></div></div>
        <div class="meter"><label>Street chaos</label><div class="bar"><i id="bar-chaos" class="chaos"></i></div></div>
        <div class="meter"><label>Bin time</label><div class="bar"><i id="bar-time" class="time"></i></div></div>
        <div class="money" id="hud-money"></div>
      </div>
    </header>

    <aside class="panel">
      <nav class="tabs">
        <button data-tab="tray" class="on">Waste <span id="c-tray"></span></button>
        <button data-tab="diary">Calendar</button>
        <button data-tab="post">Post <span id="c-post"></span></button>
        <button data-tab="phone">Phone <span id="c-phone"></span></button>
      </nav>
      <div class="tab-body" id="tab-body"></div>
      <div class="evening" id="evening"></div>
      <div class="actions">
        <button id="btn-tip" class="ghost">Tip run</button>
        <button id="btn-wash" class="ghost">Wash bins</button>
        <button id="btn-sub" class="ghost hidden">Subscribe</button>
        <button id="btn-day" class="primary">End the day</button>
      </div>
    </aside>

    <div class="modal hidden" id="modal">
      <div class="sheet" id="sheet"></div>
      <button class="close" id="modal-close">Close</button>
    </div>
  `;
}

function wire(root) {
  root.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => { tab = b.dataset.tab; render(); })
  );
  root.querySelector('#btn-day').addEventListener('click', () => {
    const events = advanceDay(state);
    selectedUid = null;
    bus.emit('day-advanced');
    render();
    showDaySummary(events);
  });
  root.querySelector('#btn-tip').addEventListener('click', () => {
    const r = tipRun(state);
    toast(r.ok ? `Tip run: ${r.removed} item(s) dealt with.` : r.why);
    bus.emit('state-changed');
    render();
  });
  root.querySelector('#btn-sub').addEventListener('click', () => {
    const r = buySubscription(state, 'green');
    toast(r.ok ? 'Garden waste subscription purchased. £60.' : r.why);
    bus.emit('state-changed');
    render();
  });
  root.querySelector('#btn-wash').addEventListener('click', () => openWashSheet());
  root.querySelector('#modal-close').addEventListener('click', closeModal);
}

// ---------- interaction ----------

function onBinClicked(key) {
  const bin = state.bins[key];
  if (!isAvailable(state, key)) {
    toast('That bin is on somebody else\'s drive.');
    return;
  }
  if (bin && bin.tipped) {
    const r = tidyBin(state, key);
    if (r.ok) toast('Bin righted, rubbish picked up.');
  } else if (selectedUid) {
    binItem(state, selectedUid, key);
    selectedUid = null;
  } else {
    const r = toggleKerb(state, key);
    if (r && r.caught) toast('Caught. In your pyjamas.');
    else if (r && !r.ok) toast(r.why);
  }
  bus.emit('state-changed');
  render();
}

// ---------- evening ----------

function eveningStrip() {
  const e = state.evening;
  if (!e.peeked) {
    return `<button class="ghost wide" id="btn-peek">Look through the window</button>`;
  }
  if (!e.neighboursOut) {
    return `<p class="all-clear">Nobody about. Go on, quickly.</p>`;
  }
  return e.dressed
    ? `<p class="all-clear">Dressed. You can be seen in public.</p>`
    : `<p class="someone">Someone is out there.
       <button class="ghost small" id="btn-dress">Get dressed</button></p>`;
}

function bindEvening() {
  const peek = document.querySelector('#btn-peek');
  if (peek) peek.addEventListener('click', () => {
    peekWindow(state);
    render();
  });
  const dress = document.querySelector('#btn-dress');
  if (dress) dress.addEventListener('click', () => {
    const r = getDressed(state);
    if (!r.ok) toast(r.why);
    render();
  });
}

function openWashSheet() {
  const rs = rulesFor(state);
  const rows = Object.entries(state.bins)
    .filter(([, b]) => !b.neighbour)
    .map(([key, b]) => {
      const pct = Math.round(b.grime * 100);
      const clean = b.grime < 0.05;
      return `<li>${nameOf(state, b.type)} — ${clean ? 'clean' : `${pct}% grimy`}
        ${clean ? '' : `<button class="ghost small" data-wash="${key}">£${WASH_COST}</button>`}</li>`;
    })
    .join('');
  showModal(`<h3>Bin cleaning service</h3>
    <p>A man with a pressure washer comes down the road on Thursdays.
    £${WASH_COST} a bin. Grimy bins attract flies, and the smell carries.</p>
    <ul class="washlist">${rows}</ul>`);
  document.querySelectorAll('[data-wash]').forEach((b) =>
    b.addEventListener('click', () => {
      const r = washBin(state, b.dataset.wash);
      toast(r.ok ? 'Scrubbed out. Smells of nothing.' : r.why);
      bus.emit('state-changed');
      render();
      openWashSheet();
    })
  );
}

// ---------- rendering ----------

function render() {
  const rs = rulesFor(state);
  const q = (s) => document.querySelector(s);

  q('#hud-day').textContent = `${DAY_NAMES[weekday(state.day)]}, day ${state.day}`;
  q('#hud-week').textContent =
    ` · week ${Math.floor(state.day / 7) % rs.rota.cycleWeeks === 0 ? 'A' : 'B'}`;

  const today = collectionsOn(state.day, rs);
  const next = nextCollectionDay(state.day + 1, rs);
  q('#hud-next').innerHTML = today.length
    ? `<b>Collection was this morning:</b> ${today.map((t) => nameOf(state, t)).join(', ')}`
    : next
      ? `Next collection: <b>${dayName(next.day)}</b> (in ${next.day - state.day} day${next.day - state.day === 1 ? '' : 's'}) — ${next.bins.map((t) => nameOf(state, t)).join(', ')}`
      : 'No collections scheduled.';

  q('#bar-standing').style.width = `${state.standing}%`;
  q('#bar-standing').className = state.standing < 30 ? 'low' : state.standing < 60 ? 'mid' : '';
  q('#hud-money').textContent = `£${state.money}`;
  q('#bar-chaos').style.width = `${Math.min(100, state.street.chaos * 6)}%`;
  q('#bar-time').style.width = `${state.binTime}%`;
  q('#evening').innerHTML = eveningStrip();

  q('#c-tray').textContent = state.tray.length ? state.tray.length : '';
  const unreadPost = state.inbox.filter((l) => l.unread).length;
  const unreadPhone = state.messages.filter((m) => m.unread).length;
  q('#c-post').textContent = unreadPost || '';
  q('#c-phone').textContent = unreadPhone || '';
  q('#c-post').className = unreadPost ? 'dot' : '';
  q('#c-phone').className = unreadPhone ? 'dot' : '';

  document.querySelectorAll('.tabs button').forEach((b) =>
    b.classList.toggle('on', b.dataset.tab === tab)
  );

  const sub = rs.bins.green && rs.bins.green.subscription;
  const btnSub = q('#btn-sub');
  btnSub.classList.toggle('hidden', !sub || sub.subscribed);
  if (sub && !sub.subscribed) btnSub.textContent = `Subscribe £${sub.costPerYear}`;

  q('#tab-body').innerHTML =
    tab === 'tray' ? trayView(rs)
    : tab === 'diary' ? calendarView(rs)
    : tab === 'post' ? postView()
    : phoneView();
  bindTabBody(rs);
  bindEvening();
}

function trayView(rs) {
  if (!state.tray.length && !Object.values(state.bins).some((b) => b.items.length))
    return `<p class="empty">Nothing to sort. Enjoy it.</p>`;

  const chips = state.tray
    .map(
      (i) => `<button class="chip ${selectedUid === i.uid ? 'sel' : ''}"
        data-uid="${i.uid}" title="${(i.note || '').replace(/"/g, '&quot;')}">
        ${i.name}${i.volume > 4 ? ` <em>${i.volume} vol</em>` : ''}</button>`
    )
    .join('');

  const contents = Object.entries(state.bins)
    .map(([key, bin]) => {
      if (!bin.items.length) return '';
      const rows = bin.items
        .map((i) => `<li><button class="mini" data-out="${key}" data-uid="${i.uid}">×</button> ${i.name}</li>`)
        .join('');
      const label = bin.neighbour
        ? `Neighbour's ${nameOf(state, bin.type).toLowerCase()}`
        : nameOf(state, bin.type);
      return `<details><summary>${label} (${bin.items.length})</summary><ul>${rows}</ul></details>`;
    })
    .join('');

  return `
    <p class="hint">Pick an item, then click a bin. Click a bin with nothing
    selected to wheel it out to the kerb.</p>
    <div class="chips">${chips || '<span class="empty">Tray empty.</span>'}</div>
    ${itemActions()}
    <h4>In the bins</h4>${contents || '<p class="empty">All empty.</p>'}
  `;
}

// A month at a glance, in the player's own colours. This is the sheet you
// actually plan around, so it shows what is collected when, plus the dates
// the council's changes bite.
function calendarView(rs) {
  const startOfWeek = Math.floor(state.day / 7) * 7;
  const first = Math.max(0, startOfWeek - 7);
  const letters = allLetters();

  let html = `<div class="cal"><div class="cal-head">${
    DAY_NAMES.map((d) => `<span>${d}</span>`).join('')
  }</div><div class="cal-grid">`;

  for (let n = 0; n < 28; n++) {
    const day = first + n;
    const bins = collectionsOn(day, rs);
    // Flavour-only letters change nothing, so the calendar should not warn.
    const effective = letters.filter((l) => l.effectiveDay === day && l.ops.length);
    const arriving = letters.filter((l) => l.arrivesDay === day);
    const classes = [
      'cal-day',
      day === state.day ? 'today' : '',
      day < state.day ? 'past' : '',
    ].join(' ');

    const dots = bins
      .map((t) => {
        const entry = state.scheme[t] || defaultScheme[t];
        return `<i style="background:${colourOf(entry.colour).css}"></i>`;
      })
      .join('');

    html += `<div class="${classes}">
      <b>${day}</b>
      <span class="dots">${dots}</span>
      ${effective.length ? '<em class="rule">rules change</em>' : ''}
      ${arriving.length ? '<em class="post-due">post</em>' : ''}
    </div>`;
  }

  return html + `</div></div>
    <p class="hint">Collection days show the bins due that morning. Put them
    out the evening before.</p>`;
}

// Verbs that only apply to the item you have picked up.
function itemActions() {
  const item = state.tray.find((i) => i.uid === selectedUid);
  if (!item) return '';

  const verbs = [];
  if (item.flattenable) verbs.push(`<button class="ghost small" data-act="flatten">Flatten it (${item.volume} → ${item.flattenable} vol)</button>`);
  if (item.wildlife) verbs.push(`<button class="ghost small" data-act="wildlife">Check the pile first</button>`);
  if (item.flyTip) verbs.push(`<button class="ghost small danger" data-act="flytip">Fly-tip it (£${item.flyTip})</button>`);

  const warn = item.flyTip
    ? `<p class="note-small">${state.evening.peeked
        ? (state.evening.neighboursOut
            ? 'Someone is out there. This would be seen.'
            : 'Nobody about. You would probably get away with it.')
        : 'You have not looked out of the window yet.'}</p>`
    : '';

  return verbs.length || item.note
    ? `<div class="item-actions">
        ${item.note ? `<p class="note-small">${item.note}</p>` : ''}
        ${verbs.join(' ')}${warn}
      </div>`
    : '';
}

function postView() {
  if (!state.inbox.length) return `<p class="empty">No post yet.</p>`;
  return state.inbox
    .map(
      (l, n) => `<button class="letter ${l.unread ? 'unread' : ''}" data-letter="${n}">
        <span class="from">District Council</span>
        <span class="subject">${l.subject}</span>
        <span class="when">day ${l.receivedDay} · effective day ${l.effectiveDay}</span>
      </button>`
    )
    .join('');
}

function phoneView() {
  if (!state.messages.length) return `<p class="empty">Quiet, for now.</p>`;
  const favour =
    state.favour && state.favour.status === 'asked'
      ? `<div class="favour">
           <p>${state.favour.from} needs their ${nameOf(state, state.favour.binType).toLowerCase()} out by
           ${dayName(state.favour.dueDay)}.</p>
           <button class="primary" data-favour="yes">Of course</button>
           <button class="ghost" data-favour="no">Sorry, can't</button>
         </div>`
      : '';
  const list = state.messages
    .map(
      (m) => `<div class="msg ${m.unread ? 'unread' : ''} ${
        /Council/i.test(m.from) ? 'council' : ''
      }">
        <span class="from">${m.from}</span>
        <p>${fillTemplate(state, m.text)}</p>
        <span class="when">day ${m.day}</span></div>`
    )
    .join('');
  return favour + list;
}

function bindTabBody(rs) {
  const body = document.querySelector('#tab-body');

  body.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      selectedUid = selectedUid === c.dataset.uid ? null : c.dataset.uid;
      render();
    })
  );
  body.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      const uid = selectedUid;
      let r;
      if (b.dataset.act === 'flatten') r = flattenItem(state, uid);
      if (b.dataset.act === 'wildlife') r = checkForWildlife(state, uid);
      if (b.dataset.act === 'flytip') {
        r = flyTip(state, uid);
        selectedUid = null;
        if (r.ok) toast(r.caught ? 'Caught. £60 penalty.' : `Gone. £${r.gained} better off.`);
      }
      if (r && !r.ok) toast(r.why);
      bus.emit('state-changed');
      render();
    })
  );
  body.querySelectorAll('.mini').forEach((b) =>
    b.addEventListener('click', () => {
      unbinItem(state, b.dataset.out, b.dataset.uid);
      bus.emit('state-changed');
      render();
    })
  );
  body.querySelectorAll('.letter').forEach((b) =>
    b.addEventListener('click', () => {
      const letter = state.inbox[Number(b.dataset.letter)];
      letter.unread = false;
      openLetter(letter, rs);
      render();
    })
  );
  body.querySelectorAll('[data-favour]').forEach((b) =>
    b.addEventListener('click', () => {
      answerFavour(state, b.dataset.favour === 'yes');
      state.messages.forEach((m) => (m.unread = false));
      bus.emit('state-changed');
      render();
    })
  );
  if (tab === 'phone') state.messages.forEach((m) => (m.unread = false));
}

// ---------- modals ----------

function openLetter(letter, rs) {
  const changes = letter.ops.map((op) => describeOp(op, rs)).filter(Boolean);
  showModal(`
    <div class="letterhead">DISTRICT COUNCIL</div>
    <h3>${letter.subject}</h3>
    <p class="effective">Effective from day ${letter.effectiveDay}</p>
    <pre>${fillTemplate(state, letter.body)}</pre>
    ${changes.length ? `<div class="changes"><h4>What actually changes</h4><ul>${changes.map((c) => `<li>${c}</li>`).join('')}</ul></div>` : ''}
  `);
}

function describeOp(op, rs) {
  const binName = (id) => (rs.bins[id] ? nameOf(state, id) : id);
  const m = op.path.match(/^bins\.(\w+)\.(\w+)/);
  if (m && m[2] === 'accepts')
    return op.op === 'add'
      ? `${binName(m[1])} now takes ${op.value}.`
      : `${binName(m[1])} no longer takes ${op.value}.`;
  if (m && m[2] === 'subscription')
    return `${binName(m[1])} becomes a paid service (£${op.value.costPerYear}/year).`;
  if (m && m[2] === 'active') return `${binName(m[1])} is introduced.`;
  if (op.path === 'rota.collections') return `New collection added to the rota.`;
  if (op.path === 'rota.holidayShifts')
    return `Collections between days ${op.value.fromDay}–${op.value.toDay} move ${op.value.shiftDays} day later.`;
  return null;
}

function showDaySummary(events) {
  if (state.over) {
    showModal(`<h3>The street has had enough</h3>
      <p>Your standing hit zero on day ${state.day}. There is a passive-aggressive
      note on the black bin and nobody makes eye contact any more.</p>`);
    return;
  }
  if (!events || !events.length) return;
  showModal(`<h3>${dayName(state.day)}, day ${state.day}</h3><ul class="daylog">${
    events.map((e) => `<li class="${e.tone}">${e.text}</li>`).join('')
  }</ul>`);
}

function showModal(html) {
  document.querySelector('#sheet').innerHTML = html;
  document.querySelector('#modal').classList.remove('hidden');
}
function closeModal() {
  document.querySelector('#modal').classList.add('hidden');
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
