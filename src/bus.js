// bus.js — the only channel between the Phaser scene and the HTML overlay.
const target = new EventTarget();

export const bus = {
  on(name, fn) { target.addEventListener(name, (e) => fn(e.detail)); },
  emit(name, detail) { target.dispatchEvent(new CustomEvent(name, { detail })); },
};
