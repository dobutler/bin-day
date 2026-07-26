// Cheap static check: every Phaser API the scene relies on actually exists
// in this version. Catches typos and version drift without booting a game.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
for (const k of Object.getOwnPropertyNames(dom.window)) {
  if (k in globalThis && k !== 'window' && k !== 'document') continue;
  try { globalThis[k] = dom.window[k]; }
  catch { try { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true }); } catch {} }
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const Phaser = (await import('phaser/dist/phaser.js')).default;

const graphicsMethods = [
  'clear', 'fillStyle', 'lineStyle', 'fillRect', 'fillRoundedRect',
  'strokeRoundedRect', 'fillCircle', 'fillEllipse', 'beginPath', 'moveTo',
  'lineTo', 'closePath', 'fillPath', 'strokeRect', 'save', 'restore',
  'translateCanvas', 'rotateCanvas',
];

const missing = graphicsMethods.filter(
  (m) => typeof Phaser.GameObjects.Graphics.prototype[m] !== 'function'
);

const colour = Phaser.Display.Color.IntegerToColor(0x2b6cb0);
const checks = [
  ['Graphics methods', missing.length === 0 ? 'all present' : `MISSING: ${missing}`],
  ['Color.darken', typeof colour.darken === 'function' ? 'ok' : 'MISSING'],
  ['Geom.Rectangle.Contains', typeof Phaser.Geom.Rectangle.Contains === 'function' ? 'ok' : 'MISSING'],
  ['Scale.FIT', Phaser.Scale.FIT !== undefined ? 'ok' : 'MISSING'],
  ['Scale.CENTER_HORIZONTALLY', Phaser.Scale.CENTER_HORIZONTALLY !== undefined ? 'ok' : 'MISSING'],
  ['Phaser.AUTO', Phaser.AUTO !== undefined ? 'ok' : 'MISSING'],
];

let failed = false;
for (const [name, result] of checks) {
  if (String(result).includes('MISSING')) failed = true;
  console.log(`${failed && String(result).includes('MISSING') ? '✗' : '✓'} ${name}: ${result}`);
}
process.exit(failed ? 1 : 0);
