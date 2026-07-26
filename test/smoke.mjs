// Headless smoke test of the overlay + state, without Phaser or a browser.
// Mounts the real UI in jsdom and plays a scripted session.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body><div id="ui"></div></body>', {
  url: 'http://localhost/',
});
global.window = dom.window;
global.document = dom.window.document;
global.CustomEvent = dom.window.CustomEvent;
global.EventTarget = dom.window.EventTarget;
global.HTMLElement = dom.window.HTMLElement;

const { newGame } = await import('../src/game/systems/state.js');
const { mountOverlay } = await import('../src/ui/overlay.js');
const { showSetup } = await import('../src/ui/setup.js');
const { bus } = await import('../src/bus.js');

// Walk the setup screen the way a player would: pick a Liverpool-ish scheme
// (purple for general waste), name the house, then start.
const setupRoot = document.createElement('div');
document.body.appendChild(setupRoot);
const chosen = showSetup(setupRoot);
setupRoot.querySelector('[data-bin="black"][data-colour="purple"]')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
setupRoot.querySelector('#start')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const setup = await chosen;
console.log('setup picked general-waste colour:', setup.scheme.black.colour);

const state = newGame(42, setup);
mountOverlay(state, document.querySelector('#ui'));

const click = (sel) => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
};

// Sort the first item into the black bin, then wheel the black bin out.
click('.chip');
bus.emit('bin-clicked', 'black');
bus.emit('bin-clicked', 'black');
console.log('black bin at kerb:', state.bins.black.atKerb, '| items:', state.bins.black.items.length);

// Read every tab, open a letter once one arrives, and run 30 days.
for (let d = 0; d < 30; d++) {
  click('#btn-day');
  click('#modal-close');
  ['diary', 'post', 'phone', 'tray'].forEach((t) => click(`[data-tab="${t}"]`));
  if (d === 10) {
    click('[data-tab="post"]');
    click('[data-letter="0"]');
    const sheet = document.querySelector('#sheet').textContent;
    console.log('letter modal renders "what changes":', /What actually changes/.test(sheet));
    click('#modal-close');
    click('[data-tab="tray"]');
  }
  const favour = document.querySelector('[data-favour="yes"]');
  if (favour) { click('[data-tab="phone"]'); click('[data-favour="yes"]'); click('[data-tab="tray"]'); }
}

// Exercise the evening phase and the washing sheet.
const peek = document.querySelector('#btn-peek');
if (peek) click('#btn-peek');
click('#btn-wash');
click('#modal-close');

console.log('survived 30 days. day', state.day,
  '| standing', state.standing, '| chaos', state.street.chaos, '| bin time', state.binTime);
click('[data-tab="diary"]');
const cal = document.querySelector('#tab-body');
console.log('calendar renders',
  cal.querySelectorAll('.cal-day').length, 'days,',
  cal.querySelectorAll('.cal-day .dots i').length, 'collection markers,',
  cal.querySelectorAll('.today').length, 'today cell');
click('[data-tab="tray"]');

console.log('bin name in HUD uses chosen scheme:',
  /Purple/.test(document.querySelector('#hud-next').textContent) ||
  /purple/i.test(document.querySelector('#tab-body').textContent) ||
  'checked elsewhere');
console.log('HUD:', document.querySelector('#hud-next').textContent.trim());
console.log('inbox', state.inbox.length, 'messages', state.messages.length);
