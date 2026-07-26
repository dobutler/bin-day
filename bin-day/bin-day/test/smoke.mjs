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
const { bus } = await import('../src/bus.js');

const state = newGame(42);
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
  ['post', 'phone', 'tray'].forEach((t) => click(`[data-tab="${t}"]`));
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

console.log('survived 30 days. day', state.day, 'standing', state.standing);
console.log('HUD:', document.querySelector('#hud-next').textContent.trim());
console.log('inbox', state.inbox.length, 'messages', state.messages.length);
