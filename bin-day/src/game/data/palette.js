// palette.js
// Councils across the UK use wildly different colours for the same job.
// Liverpool's purple bin is general waste; Cambridge has no purple bin at
// all. So the player picks their own local scheme at the start, and the
// rules underneath stay keyed to *function*, not colour.

export const streams = [
  { id: 'black', stream: 'general',   label: 'General waste',
    blurb: 'Everything that cannot be recycled or composted.' },
  { id: 'blue',  stream: 'recycling', label: 'Recycling',
    blurb: 'Paper, card, plastics, metal, and glass for now.' },
  { id: 'green', stream: 'garden',    label: 'Garden and food waste',
    blurb: 'Cuttings and kitchen scraps, until the council changes its mind.' },
  { id: 'caddy', stream: 'food',      label: 'Food caddy',
    blurb: 'Arrives later, whether you want it or not.' },
];

export const colours = [
  { id: 'black',  name: 'Black',  hex: 0x2b2b2b, css: '#2b2b2b' },
  { id: 'blue',   name: 'Blue',   hex: 0x2b6cb0, css: '#2b6cb0' },
  { id: 'green',  name: 'Green',  hex: 0x2f855a, css: '#2f855a' },
  { id: 'purple', name: 'Purple', hex: 0x6b3fa0, css: '#6b3fa0' },
  { id: 'brown',  name: 'Brown',  hex: 0x7b5e3b, css: '#7b5e3b' },
  { id: 'grey',   name: 'Grey',   hex: 0x707c86, css: '#707c86' },
  { id: 'maroon', name: 'Maroon', hex: 0x8c2f39, css: '#8c2f39' },
  { id: 'teal',   name: 'Teal',   hex: 0x1f6f6b, css: '#1f6f6b' },
];

export const stickers = [
  { id: 'none',   label: 'None',        glyph: '' },
  { id: 'star',   label: 'Star',        glyph: '★' },
  { id: 'heart',  label: 'Heart',       glyph: '♥' },
  { id: 'flower', label: 'Flower',      glyph: '✿' },
  { id: 'bolt',   label: 'Lightning',   glyph: '⚡' },
  { id: 'cat',    label: 'Cat',         glyph: '🐈' },
  { id: 'crown',  label: 'Crown',       glyph: '♛' },
];

// The default is a fairly common English scheme, so the setup screen has
// something sensible pre-selected.
export const defaultScheme = {
  black: { colour: 'black', sticker: 'none' },
  blue:  { colour: 'blue',  sticker: 'none' },
  green: { colour: 'green', sticker: 'none' },
  caddy: { colour: 'brown', sticker: 'none' },
};

export function colourOf(id) {
  return colours.find((c) => c.id === id) || colours[0];
}

export function stickerOf(id) {
  return stickers.find((s) => s.id === id) || stickers[0];
}

// "Purple bin", "Grey bin", "Purple caddy".
export function binNameFor(binId, scheme) {
  const entry = scheme[binId] || defaultScheme[binId];
  const noun = binId === 'caddy' ? 'caddy' : 'bin';
  return `${colourOf(entry.colour).name} ${noun}`;
}
