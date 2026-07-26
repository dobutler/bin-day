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
const KERB_Y = 214;   // where bins stand on the pavement edge
const DRIVE_Y = 178;  // where they live the rest of the time

const C = {
  sky:       0x8fa8bd,
  brick:     0x8c3b2e,
  brickAlt:  0x7c3327,
  mortar:    0x5e2a20,
  roof:      0x4a2f24,
  roofDark:  0x38221a,
  outline:   0x241610,
  grass:     0x5f8a37,
  grassDark: 0x4c7029,
  hedge:     0x3f6b26,
  path:      0x9a938a,
  pathDark:  0x827b73,
  pavement:  0xa8a29a,
  kerb:      0x87817a,
  road:      0x3f3f42,
  roadLine:  0xd0d0d0,
  fence:     0x7c5a38,
  fenceDark: 0x5f4429,
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

    g.fillStyle(C.sky, 1).fillRect(0, 0, W, 40);

    // Terrace roof, stepped so it reads as pixel art rather than a smooth ramp.
    g.fillStyle(C.roof, 1);
    for (let n = 0; n < 22; n++) g.fillRect(0, 40 - n * 2, 14 + n * 9, 2);
    g.fillStyle(C.roofDark, 1).fillRect(0, 40, 212, 4);

    // Brick wall, course by course with offset rows.
    for (let y = 44; y < 158; y += 5) {
      const offset = ((y - 44) / 5) % 2 === 0 ? 0 : 5;
      for (let x = -10; x < 200; x += 11) {
        g.fillStyle((x + y) % 3 === 0 ? C.brickAlt : C.brick, 1);
        g.fillRect(x + offset, y, 10, 4);
      }
    }
    g.fillStyle(C.mortar, 1).fillRect(196, 44, 4, 114);

    // Windows, door, drainpipe.
    this.window(g, 24, 60, 34, 30);
    this.window(g, 120, 60, 34, 30);
    g.fillStyle(C.frame, 1).fillRect(58, 108, 34, 50);
    g.fillStyle(C.door, 1).fillRect(61, 111, 28, 47);
    g.fillStyle(C.lampGlow, 1).fillRect(84, 132, 3, 3);
    g.fillStyle(C.mortar, 1).fillRect(184, 44, 3, 114);

    // Fence and hedge running off to the right.
    g.fillStyle(C.fenceDark, 1).fillRect(200, 96, W - 200, 40);
    g.fillStyle(C.fence, 1);
    for (let x = 202; x < W; x += 7) g.fillRect(x, 96, 5, 40);
    g.fillStyle(C.hedge, 1).fillRect(200, 128, W - 200, 16);
    g.fillStyle(C.grassDark, 1);
    for (let x = 204; x < W; x += 9) g.fillRect(x, 124, 3, 5);

    // Front garden, path, pavement, kerb, road.
    g.fillStyle(C.grass, 1).fillRect(0, 144, W, 52);
    g.fillStyle(C.grassDark, 1);
    for (let x = 6; x < W; x += 13) g.fillRect(x, 150 + ((x % 3) * 4), 3, 3);

    g.fillStyle(C.path, 1).fillRect(60, 158, 30, 38);
    g.fillStyle(C.pathDark, 1).fillRect(60, 158, 30, 2);
    g.fillStyle(C.path, 1).fillRect(140, 158, 96, 38);   // the drive

    g.fillStyle(C.pavement, 1).fillRect(0, 196, W, 22);
    g.fillStyle(C.pathDark, 1);
    for (let x = 0; x < W; x += 24) g.fillRect(x, 196, 1, 22);
    g.fillStyle(C.kerb, 1).fillRect(0, 216, W, 4);

    g.fillStyle(C.road, 1).fillRect(0, 220, W, H - 220);
    g.fillStyle(C.roadLine, 0.8);
    for (let x = 8; x < W; x += 40) g.fillRect(x, 250, 20, 3);

    this.lamp(g, 30);
  }

  window(g, x, y, w, h) {
    g.fillStyle(C.frame, 1).fillRect(x, y, w, h);
    g.fillStyle(C.glass, 1).fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle(C.frame, 1);
    g.fillRect(x + w / 2 - 1, y + 3, 2, h - 6);
    g.fillRect(x + 3, y + h / 2 - 1, w - 6, 2);
  }

  lamp(g, x) {
    g.fillStyle(C.lamp, 1).fillRect(x, 70, 4, 128);
    g.fillRect(x - 6, 68, 16, 4);
    g.fillStyle(C.lampGlow, 1).fillRect(x - 5, 72, 14, 5);
    g.fillStyle(C.lamp, 1).fillRect(x - 4, 196, 12, 3);
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
    mine.forEach((key, i) => this.placeBin(key, 150 + i * 26, rs));

    const nbr = keys.find((k) => this.state.bins[k].neighbour);
    if (nbr) this.placeBin(nbr, 96, rs);

    this.drawStreetBins(rs);
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

  drawWildlife() {
    const g = this.wildlife;
    g.clear();
    if (!this.state.visuals || !this.state.visuals.foxToday) return;
    this.fox(g, 300, 190);
    this.fox(g, 336, 186);
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
    const spot = this.walkTo || { x: 132, y: DRIVE_Y };
    const x = Math.max(96, spot.x - 16);
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
