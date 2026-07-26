// Street.js
// A pixel-art three-quarter view of your bit of the road, drawn entirely
// with primitives at a low internal resolution (480x270) and scaled up with
// nearest-neighbour filtering. No sprite assets, so the repo stays
// self-contained and nothing needs licensing.
//
// Interaction is click-only:
//   click a bin with an item selected  -> put the item in that bin
//   click a tipped bin                 -> right it and pick up the spill
//   click a bin with nothing selected  -> wheel it out to the kerb, or back

import Phaser from 'phaser';
import { bus } from '../../bus.js';
import { rulesFor, colourFor, isAvailable } from '../systems/state.js';
import { streetView } from '../systems/street.js';
import { fillLevel } from '../systems/rules.js';
import { STICKER_ART, RECYCLE, stamp, stampNumber } from '../data/pixels.js';

const W = 480;
const H = 270;
const KERB_Y = 214;   // the verge at the edge of the lane
const DRIVE_Y = 190;  // the gravel by the cottage, the rest of the time

const C = {
  sky:       0xa9c2d4,
  skyLow:    0xc8d8e2,
  hill:      0x7d9a55,
  hillFar:   0x93aa6b,
  wall:      0xe4d7bd,   // limewashed render
  wallShade: 0xd2c3a5,
  stone:     0xb8a887,
  thatch:    0xb08f4e,
  thatchDk:  0x8e7038,
  roof:      0xb08f4e,
  roofDark:  0x8e7038,
  outline:   0x241610,
  grass:     0x6f9440,
  grassDark: 0x577a2f,
  hedge:     0x3f6b26,
  hedgeDark: 0x2f5320,
  path:      0xc3b394,
  pathDark:  0xa89877,
  pavement:  0xb5a98d,
  kerb:      0x9a8e74,
  road:      0x53504a,
  roadLine:  0xcfc6b0,
  fence:     0x7c5a38,
  fenceDark: 0x5f4429,
  rose:      0xc85a7a,
  bloom:     0xe8dc6a,
  glass:     0x9fc4d6,
  frame:     0xe8e4dc,
  door:      0x2c5a3e,
  lamp:      0x2f3338,
  lampGlow:  0xf2d489,
  fox:       0xc86a2a,
  foxDark:   0x9c4d1c,
  skin:      0xe0ac81,
  coat:      0x3f6ea8,
  trouser:   0x2f3a4a,
};

export class Street extends Phaser.Scene {
  constructor() {
    super('Street');
    this.binViews = {};
  }

  init() {
    this.state = this.registry.get('state');
  }

  create() {
    this.backdrop = this.add.graphics();
    this.drawBackdrop();

    this.streetLayer = this.add.graphics();
    this.pileLayer = this.add.graphics();
    this.wildlife = this.add.graphics();
    this.binLayer = this.add.container(0, 0);
    this.resident = this.add.graphics();

    this.refresh();

    bus.on('state-changed', () => this.refresh());
    bus.on('day-advanced', () => { this.flashMorning(); this.refresh(); });
  }

  // ---------- scenery ----------

  drawBackdrop() {
    const g = this.backdrop;
    g.clear();

    // sky, and the fields behind the cottage
    g.fillStyle(C.sky, 1).fillRect(0, 0, W, 30);
    g.fillStyle(C.skyLow, 1).fillRect(0, 22, W, 12);
    g.fillStyle(C.hillFar, 1);
    for (let x = 0; x < W; x += 2) {
      g.fillRect(x, 30 + Math.round(Math.sin(x / 42) * 5), 2, 20);
    }
    g.fillStyle(C.hill, 1);
    for (let x = 0; x < W; x += 2) {
      g.fillRect(x, 44 + Math.round(Math.sin(x / 30 + 2) * 4), 2, 26);
    }
    // a drystone wall between the fields
    g.fillStyle(C.stone, 1);
    for (let x = 0; x < W; x += 9) g.fillRect(x, 58 + ((x / 9) % 2), 8, 3);

    // the cottage: limewashed render, thatched roof, chimney
    g.fillStyle(C.wall, 1).fillRect(28, 74, 176, 84);
    g.fillStyle(C.wallShade, 1).fillRect(28, 74, 6, 84);
    g.fillStyle(C.stone, 1).fillRect(28, 150, 176, 8);

    // thatch, drawn as stepped courses with a shaggy bottom edge
    g.fillStyle(C.thatch, 1);
    for (let n = 0; n < 26; n++) {
      g.fillRect(16 + n * 3.6, 74 - n * 2, 200 - n * 7.2, 2);
    }
    g.fillStyle(C.thatchDk, 1);
    for (let x = 16; x < 216; x += 4) g.fillRect(x, 72, 3, 4);
    g.fillStyle(C.thatch, 1).fillRect(16, 68, 200, 5);

    // chimney and smoke
    g.fillStyle(C.stone, 1).fillRect(150, 20, 18, 34);
    g.fillStyle(C.wallShade, 1).fillRect(150, 18, 18, 4);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(158, 10, 5, 5);
    g.fillRect(163, 3, 4, 4);

    this.window(g, 46, 92, 32, 28);
    this.window(g, 152, 92, 32, 28);
    g.fillStyle(C.roofDark, 1).fillRect(102, 108, 34, 50);   // door frame
    g.fillStyle(0x3d6b4a, 1).fillRect(105, 111, 28, 47);     // door
    g.fillStyle(C.bloom, 1).fillRect(128, 134, 3, 3);        // knocker

    // climbing rose either side of the door
    for (const bx of [96, 138]) {
      g.fillStyle(C.hedgeDark, 1).fillRect(bx, 116, 2, 42);
      for (let n = 0; n < 7; n++) {
        const rx = bx + ((n % 2) ? 3 : -3);
        g.fillStyle(C.hedge, 1).fillRect(rx, 120 + n * 5, 3, 3);
        if (n % 2 === 0) g.fillStyle(C.rose, 1).fillRect(rx + 1, 118 + n * 5, 2, 2);
      }
    }

    // hedgerow to the right, with a five-bar gate
    g.fillStyle(C.hedge, 1).fillRect(216, 108, W - 216, 50);
    g.fillStyle(C.hedgeDark, 1);
    for (let x = 218; x < W; x += 7) g.fillRect(x, 108 + ((x % 3) * 3), 4, 8);
    g.fillStyle(C.bloom, 0.8);
    for (let x = 224; x < W; x += 23) g.fillRect(x, 118, 2, 2);
    g.fillStyle(C.fence, 1);
    g.fillRect(300, 118, 3, 40);
    g.fillRect(352, 118, 3, 40);
    for (let n = 0; n < 4; n++) g.fillRect(300, 122 + n * 9, 55, 2);

    // cottage garden, gravel path, verge, lane
    g.fillStyle(C.grass, 1).fillRect(0, 158, W, 40);
    g.fillStyle(C.grassDark, 1);
    for (let x = 4; x < W; x += 11) g.fillRect(x, 162 + ((x % 4) * 5), 3, 3);
    g.fillStyle(C.bloom, 0.9);
    for (let x = 250; x < W; x += 31) g.fillRect(x, 166 + ((x % 3) * 6), 2, 2);
    g.fillStyle(C.rose, 0.9);
    for (let x = 262; x < W; x += 37) g.fillRect(x, 174, 2, 2);

    g.fillStyle(C.path, 1).fillRect(104, 158, 30, 40);
    g.fillStyle(C.path, 1).fillRect(140, 168, 100, 30);      // where the bins live
    g.fillStyle(C.pathDark, 1);
    for (let x = 106; x < 240; x += 7) g.fillRect(x, 170 + ((x % 5) * 4), 2, 2);

    g.fillStyle(C.pavement, 1).fillRect(0, 198, W, 20);
    g.fillStyle(C.grassDark, 1);
    for (let x = 0; x < W; x += 6) g.fillRect(x, 198, 2, 3);  // grass verge edge
    g.fillStyle(C.kerb, 1).fillRect(0, 216, W, 4);

    g.fillStyle(C.road, 1).fillRect(0, 220, W, H - 220);
    g.fillStyle(C.roadLine, 0.35);
    for (let x = 4; x < W; x += 46) g.fillRect(x, 246, 16, 2);
    g.fillStyle(0x45423d, 1);
    for (let x = 0; x < W; x += 13) g.fillRect(x, 232 + ((x % 3) * 9), 5, 2);

    this.lamp(g, 40);
  }

  window(g, x, y, w, h) {
    g.fillStyle(C.frame, 1).fillRect(x, y, w, h);
    g.fillStyle(C.glass, 1).fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle(C.frame, 1);
    g.fillRect(x + w / 2 - 1, y + 3, 2, h - 6);
    g.fillRect(x + 3, y + h / 2 - 1, w - 6, 2);
  }

  lamp(g, x) {
    // A black cast-iron lamp post, of the sort a parish council is proud of.
    g.fillStyle(C.lamp, 1).fillRect(x, 96, 3, 102);
    g.fillRect(x - 3, 194, 9, 4);
    g.fillRect(x - 4, 84, 11, 3);
    g.fillStyle(C.lampGlow, 1).fillRect(x - 3, 87, 9, 9);
    g.fillStyle(C.lamp, 1).fillRect(x - 4, 82, 11, 2);
    g.fillRect(x + 1, 78, 1, 4);
  }

  // ---------- bins ----------

  refresh() {
    const rs = rulesFor(this.state);
    const keys = Object.keys(this.state.bins);

    for (const key of Object.keys(this.binViews)) {
      if (!keys.includes(key)) {
        this.binViews[key].container.destroy();
        delete this.binViews[key];
      }
    }

    const mine = keys.filter((k) => !this.state.bins[k].neighbour);
    mine.forEach((key, i) => this.placeBin(key, 156 + i * 26, rs));

    const nbr = keys.find((k) => this.state.bins[k].neighbour);
    if (nbr) this.placeBin(nbr, 74, rs);

    this.drawStreetBins(rs);
    this.drawPile();
    this.drawWildlife();
    this.drawResident();
  }

  placeBin(key, homeX, rs) {
    const bin = this.state.bins[key];
    bin.key = key;
    let view = this.binViews[key];

    if (!view) {
      const container = this.add.container(homeX, DRIVE_Y);
      const body = this.add.graphics();
      container.add(body);
      container.setSize(20, 28);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-10, -26, 20, 28),
        Phaser.Geom.Rectangle.Contains
      );
      container.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      container.on('pointerout', () => this.input.setDefaultCursor('default'));
      container.on('pointerdown', () => bus.emit('bin-clicked', key));
      this.binLayer.add(container);
      view = this.binViews[key] = { container, body };
    }

    const targetY = bin.atKerb ? KERB_Y : DRIVE_Y;
    if (Math.round(view.container.y) !== targetY) {
      this.tweens.add({
        targets: view.container, x: homeX, y: targetY,
        duration: 340, ease: 'Sine.easeInOut',
      });
      this.walkTo = { x: homeX, y: targetY };
    } else {
      view.container.x = homeX;
      view.container.y = targetY;
    }

    view.container.setAngle(bin.tipped ? -74 : 0);
    view.container.setAlpha(isAvailable(this.state, key) ? 1 : 0.3);
    this.paintBin(view.body, bin, rs);
  }

  // A wheelie bin in three-quarter view: front face, darker right side,
  // lid on top, two wheels underneath.
  paintBin(g, bin, rs) {
    const colour = colourFor(this.state, bin.type);
    const dark = Phaser.Display.Color.IntegerToColor(colour).darken(28).color;
    const darker = Phaser.Display.Color.IntegerToColor(colour).darken(48).color;
    const fill = fillLevel(bin.type, bin.items, rs);
    const over = fill > 1;
    const isCaddy = bin.type === 'caddy';

    const w = isCaddy ? 12 : 17;
    const h = isCaddy ? 14 : 24;
    const d = 4;

    g.clear();

    // shadow
    g.fillStyle(0x000000, 0.18).fillRect(-w / 2 - 1, 1, w + d + 2, 3);

    // wheels
    if (!isCaddy) {
      g.fillStyle(C.outline, 1);
      g.fillRect(-w / 2 + 1, -2, 4, 3);
      g.fillRect(w / 2 - 4, -2, 4, 3);
    }

    // body
    g.fillStyle(colour, 1).fillRect(-w / 2, -h, w, h - 1);
    g.fillStyle(dark, 1);
    for (let n = 0; n < d; n++) g.fillRect(w / 2 + n, -h + n, 1, h - 1 - n);
    g.fillStyle(C.outline, 0.5).fillRect(-w / 2, -1, w, 1);

    // grime creeps up the body between washes
    if (bin.grime > 0.05) {
      g.fillStyle(0x3a2f22, Math.min(0.5, bin.grime * 0.55));
      g.fillRect(-w / 2, -Math.round(h * 0.45), w, Math.round(h * 0.45) - 1);
    }

    // lid, thrown open when the bin is overfull
    g.fillStyle(darker, 1);
    if (over) {
      g.fillRect(-w / 2 - 2, -h - 7, w + 2, 3);
      g.fillStyle(0xd8cfc0, 1).fillRect(-w / 2 + 3, -h - 3, w - 6, 3);
    } else {
      g.fillRect(-w / 2 - 1, -h - 3, w + 2, 3);
      g.fillStyle(dark, 1);
      for (let n = 0; n < d; n++) g.fillRect(w / 2 + 1 + n, -h - 3 + n, 1, 3);
    }

    // recycling chevrons, stencilled on whichever bin takes recycling
    if (rs.bins[bin.type] && rs.bins[bin.type].accepts.includes('plastics')) {
      stamp(g, RECYCLE, -2, -h + 4, 0xffffff, 1, 0.85);
    }

    // sticker
    const entry = this.state.scheme[bin.type] || {};
    if (!bin.neighbour && STICKER_ART[entry.sticker]) {
      stamp(g, STICKER_ART[entry.sticker], -2, -h + 11, 0xffffff, 1, 0.9);
    }

    // house number, if you painted it on
    if (!bin.neighbour && this.state.labelled) {
      const digits = String(this.state.houseNumber);
      stampNumber(g, digits, -(digits.length * 4) / 2, -8, 0xffffff, 1);
    }
  }

  // The rest of the road. Half the street showing the wrong colour is the
  // whole point of the copycat mechanic, so it has to be visible.
  drawStreetBins(rs) {
    const g = this.streetLayer;
    g.clear();

    for (const house of streetView(this.state)) {
      const baseX = house.side === 'left' ? 250 : 360;
      house.bins.forEach((type, n) => {
        if (!rs.bins[type]) return;
        const x = baseX + house.slot * 44 + n * 13;
        const colour = colourFor(this.state, type);
        const dark = Phaser.Display.Color.IntegerToColor(colour).darken(30).color;

        g.fillStyle(0x000000, 0.16).fillRect(x - 6, KERB_Y + 1, 14, 2);
        g.fillStyle(colour, 1).fillRect(x - 5, KERB_Y - 17, 11, 16);
        g.fillStyle(dark, 1).fillRect(x + 6, KERB_Y - 15, 2, 14);
        g.fillStyle(dark, 1).fillRect(x - 6, KERB_Y - 20, 13, 3);

        // The sticker. Everyone can see the sticker.
        if (house.refused) g.fillStyle(0xd94040, 1).fillRect(x - 3, KERB_Y - 12, 7, 5);
      });
    }
  }

  drawPile() {
    const g = this.pileLayer;
    g.clear();
    const bags = Math.min(9, this.state.tray.length - 14);
    for (let n = 0; n < bags; n++) {
      const x = 44 + (n % 3) * 13;
      const y = 186 + Math.floor(n / 3) * 8;
      g.fillStyle(0x000000, 0.18).fillRect(x - 1, y + 7, 12, 2);
      g.fillStyle(0x2f3338, 1).fillRect(x, y, 11, 8);
      g.fillStyle(0x44494f, 1).fillRect(x + 2, y - 2, 6, 3);
    }
  }

  drawWildlife() {
    const g = this.wildlife;
    g.clear();
    if (!this.state.visuals || !this.state.visuals.foxToday) return;
    this.fox(g, 286, 194);
    this.fox(g, 330, 188);
  }

  fox(g, x, y) {
    g.fillStyle(C.fox, 1);
    g.fillRect(x, y - 6, 12, 6);       // body
    g.fillRect(x + 10, y - 10, 6, 5);  // head
    g.fillStyle(C.foxDark, 1);
    g.fillRect(x - 6, y - 8, 7, 3);    // tail
    g.fillRect(x + 11, y - 13, 2, 3);  // ears
    g.fillRect(x + 14, y - 13, 2, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 7, y - 8, 2, 3);    // tail tip
    g.fillStyle(C.outline, 1);
    g.fillRect(x + 15, y - 8, 1, 1);   // eye
    g.fillRect(x + 2, y, 2, 2);        // legs
    g.fillRect(x + 8, y, 2, 2);
  }

  // Someone has to wheel them out. They follow the last bin you moved.
  drawResident() {
    const g = this.resident;
    g.clear();
    const spot = this.walkTo || { x: 138, y: DRIVE_Y };
    const x = Math.max(112, spot.x - 18);
    const y = spot.y;

    g.fillStyle(0x000000, 0.16).fillRect(x - 3, y, 8, 2);
    g.fillStyle(C.trouser, 1).fillRect(x - 2, y - 6, 3, 6);
    g.fillRect(x + 2, y - 6, 3, 6);
    g.fillStyle(C.coat, 1).fillRect(x - 3, y - 15, 9, 10);
    g.fillStyle(C.skin, 1).fillRect(x - 1, y - 21, 6, 6);
    g.fillStyle(C.outline, 1).fillRect(x - 1, y - 22, 6, 2);
  }

  flashMorning() {
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x101828).setAlpha(0.7);
    this.tweens.add({
      targets: veil, alpha: 0, duration: 650,
      onComplete: () => veil.destroy(),
    });
  }
}

export const SIZE = { W, H };
