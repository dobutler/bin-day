// pixels.js
// Tiny bitmaps for things that have to stay legible at pixel-art scale:
// house numbers, bin stickers, and the wildlife.

export const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

export const STICKER_ART = {
  none:   null,
  star:   ['00100', '01110', '11111', '01110', '01010'],
  heart:  ['01010', '11111', '11111', '01110', '00100'],
  flower: ['01010', '11111', '01110', '11111', '01010'],
  bolt:   ['00110', '01100', '11111', '00110', '01100'],
  cat:    ['10001', '11111', '10101', '11111', '01010'],
  crown:  ['10101', '11111', '11111', '01110', '00000'],
};

// The recycling chevrons stencilled on the side of a recycling bin.
export const RECYCLE = [
  '00100',
  '01110',
  '00100',
  '10101',
  '11011',
];

export function stamp(g, art, x, y, colour, scale = 1, alpha = 1) {
  if (!art) return;
  g.fillStyle(colour, alpha);
  for (let row = 0; row < art.length; row++) {
    for (let col = 0; col < art[row].length; col++) {
      if (art[row][col] === '1') {
        g.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

export function stampNumber(g, text, x, y, colour, scale = 1) {
  let cursor = x;
  for (const ch of String(text)) {
    const art = DIGITS[ch];
    if (art) {
      stamp(g, art, cursor, y, colour, scale);
      cursor += 4 * scale;
    } else {
      cursor += 2 * scale;
    }
  }
}
