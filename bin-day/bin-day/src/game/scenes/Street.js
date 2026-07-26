// Street.js
// The visual half: your house, the drive, the kerb, and the bins. Everything
// is drawn with Phaser primitives — no sprite assets to source or licence,
// which keeps the repo self-contained.
//
// Interaction is deliberately click-only:
//   click a bin with an item selected  -> put the item in that bin
//   click a bin with nothing selected  -> wheel it out to the kerb, or back

import Phaser from 'phaser';
import { bus } from '../../bus.js';
import { rulesFor, binLabel } from '../systems/state.js';
import { streetView } from '../systems/street.js';
import { fillLevel, collectionsOn } from '../systems/rules.js';

const W = 960;
const H = 470;
const KERB_Y = 372;
const STORE_Y = 250;

export class Street extends Phaser.Scene {
  constructor() {
    super('Street');
    this.binViews = {};
  }

  init() {
    this.state = this.registry.get('state');
  }

  create() {
    this.drawBackdrop();
    this.binLayer = this.add.container(0, 0);
    this.streetLayer = this.add.container(0, 0);
    this.refresh();

    bus.on('state-changed', () => this.refresh());
    bus.on('day-advanced', () => { this.flashMorning(); this.refresh(); });
  }

  // ---------- static scenery ----------

  drawBackdrop() {
    const g = this.add.graphics();

    g.fillStyle(0xc7d4dd, 1).fillRect(0, 0, W, 200);            // pale sky
    g.fillStyle(0x8fa08a, 1).fillRect(0, 176, W, 40);           // hedges behind
    g.fillStyle(0xb9b0a4, 1).fillRect(0, 200, W, KERB_Y - 200); // front gardens
    g.fillStyle(0xd8d4cc, 1).fillRect(0, KERB_Y - 18, W, 26);   // pavement
    g.fillStyle(0x9c9c9c, 1).fillRect(0, KERB_Y + 8, W, 4);     // kerbstone
    g.fillStyle(0x4a4a4a, 1).fillRect(0, KERB_Y + 12, W, H - KERB_Y); // road

    // road centre line
    g.fillStyle(0xdedede, 0.7);
    for (let x = 10; x < W; x += 60) g.fillRect(x, H - 26, 34, 4);

    // your house (centre) and two neighbours
    this.drawHouse(g, 330, 60, 300, 150, 0xb08d74, 'No. 40');
    this.drawHouse(g, 60, 96, 230, 114, 0x9d8c7d, 'No. 38');
    this.drawHouse(g, 670, 96, 230, 114, 0xa8907c, 'No. 42');

    // driveways
    g.fillStyle(0xc9c4bb, 1);
    g.fillRect(392, 210, 196, KERB_Y - 214);   // yours
    g.fillRect(120, 210, 110, KERB_Y - 214);   // No. 38
  }

  drawHouse(g, x, y, w, h, colour, label) {
    g.fillStyle(colour, 1).fillRect(x, y, w, h);
    g.fillStyle(0x6b5648, 1);
    g.beginPath();
    g.moveTo(x - 12, y);
    g.lineTo(x + w / 2, y - 42);
    g.lineTo(x + w + 12, y);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x3f4a52, 1);
    g.fillRect(x + w / 2 - 22, y + h - 62, 44, 62);            // door
    g.fillStyle(0xdfe7ea, 0.9);
    g.fillRect(x + 28, y + 30, 52, 44);                        // windows
    g.fillRect(x + w - 80, y + 30, 52, 44);

    this.add.text(x + 8, y + h - 20, label, {
      fontFamily: 'Georgia, serif', fontSize: '13px', color: '#3a3a3a',
    }).setAlpha(0.8);
  }

  // ---------- bins ----------

  refresh() {
    const rs = rulesFor(this.state);
    const keys = Object.keys(this.state.bins);

    // drop views for bins that no longer exist (neighbour bin returned)
    for (const key of Object.keys(this.binViews)) {
      if (!keys.includes(key)) {
        this.binViews[key].container.destroy();
        delete this.binViews[key];
      }
    }

    const mine = keys.filter((k) => !this.state.bins[k].neighbour);
    mine.forEach((key, i) => {
      const x = 412 + i * 60;
      this.placeBin(key, x, rs);
    });

    const nbr = keys.find((k) => this.state.bins[k].neighbour);
    if (nbr) this.placeBin(nbr, 165, rs);

    this.drawStreetBins(rs);
    this.markCollectionDay(rs);
  }

  // The rest of the road, drawn small along the kerb. This is where the
  // copycat mechanic becomes visible: if half the street is showing the
  // wrong colour this morning, you can usually work out why.
  drawStreetBins(rs) {
    this.streetLayer.removeAll(true);

    for (const house of streetView(this.state)) {
      const baseX = house.side === 'left' ? 96 : 742;
      const x = baseX + house.slot * 86;

      house.bins.forEach((type, n) => {
        const def = rs.bins[type];
        if (!def) return;
        const g = this.add.graphics();
        const bx = x + n * 22;
        const by = KERB_Y - 18;

        g.fillStyle(0x000000, 0.12).fillEllipse(bx, by + 22, 26, 6);
        g.fillStyle(def.colour, 1).fillRoundedRect(bx - 12, by - 14, 24, 34, 3);
        g.fillStyle(
          Phaser.Display.Color.IntegerToColor(def.colour).darken(18).color, 1
        ).fillRoundedRect(bx - 13, by - 19, 26, 7, 2);

        if (house.refused) {
          // The sticker. Everyone can see the sticker.
          g.fillStyle(0xd94040, 1).fillRect(bx - 8, by - 6, 16, 10);
        }
        this.streetLayer.add(g);
      });

      const label = this.add
        .text(x, KERB_Y + 16, house.name.split(' (')[0], {
          fontFamily: 'system-ui, sans-serif', fontSize: '10px',
          color: house.refused ? '#ffb3b3' : '#e8e8e8',
        })
        .setOrigin(0.5, 0);
      this.streetLayer.add(label);
    }
  }

  placeBin(key, homeX, rs) {
    const bin = this.state.bins[key];
    let view = this.binViews[key];

    if (!view) {
      const container = this.add.container(homeX, STORE_Y);
      const body = this.add.graphics();
      const label = this.add
        .text(0, 46, '', {
          fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#2f2f2f',
          align: 'center', wordWrap: { width: 58 },
        })
        .setOrigin(0.5, 0);
      container.add([body, label]);
      container.setSize(48, 76);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-24, -38, 48, 76),
        Phaser.Geom.Rectangle.Contains
      );
      container.on('pointerover', () => { container.setScale(1.06); this.input.setDefaultCursor('pointer'); });
      container.on('pointerout', () => { container.setScale(1); this.input.setDefaultCursor('default'); });
      container.on('pointerdown', () => bus.emit('bin-clicked', key));
      this.binLayer.add(container);
      view = this.binViews[key] = { container, body, label, homeX };
    }

    view.homeX = homeX;
    const targetX = homeX;
    const targetY = bin.atKerb ? KERB_Y - 30 : STORE_Y;
    if (view.container.y !== targetY) {
      this.tweens.add({
        targets: view.container, x: targetX, y: targetY,
        duration: 320, ease: 'Sine.easeInOut',
      });
    } else {
      view.container.x = targetX;
    }

    this.paintBin(view, bin, rs);
  }

  paintBin(view, bin, rs) {
    const def = rs.bins[bin.type];
    const fill = fillLevel(bin.type, bin.items, rs);
    const over = fill > 1;
    const g = view.body;
    g.clear();

    // shadow
    g.fillStyle(0x000000, 0.14).fillEllipse(0, 38, 46, 10);

    // wheels
    g.fillStyle(0x222222, 1).fillCircle(-15, 33, 6).fillCircle(15, 33, 6);

    // body
    g.fillStyle(def.colour, 1);
    g.fillRoundedRect(-22, -26, 44, 60, { tl: 3, tr: 3, bl: 7, br: 7 });
    g.lineStyle(1, 0x000000, 0.25).strokeRoundedRect(-22, -26, 44, 60, 5);

    // lid — tilts open when overfull
    g.fillStyle(Phaser.Display.Color.IntegerToColor(def.colour).darken(18).color, 1);
    if (over) {
      g.save();
      g.translateCanvas(0, -30);
      g.rotateCanvas(-0.42);
      g.fillRoundedRect(-24, -8, 48, 12, 4);
      g.restore();
      g.fillStyle(0xd8cfc0, 1).fillRect(-14, -34, 28, 8); // rubbish poking out
    } else {
      g.fillRoundedRect(-24, -34, 48, 12, 4);
    }

    // fill gauge
    const h = Math.min(1, fill) * 48;
    g.fillStyle(0xffffff, 0.22).fillRect(-18, -22 + (48 - h), 36, h);

    // neighbour bins get a chalk mark, like real life
    if (bin.neighbour) {
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeRect(-10, -14, 20, 20);
    }

    const pct = Math.round(fill * 100);
    view.label.setText(`${binLabel(bin, rs)}\n${pct}%${over ? ' — lid open' : ''}`);
    view.label.setColor(over ? '#a02020' : '#2f2f2f');
  }

  markCollectionDay(rs) {
    const due = collectionsOn(this.state.day, rs);
    if (this.dueText) this.dueText.destroy();
    if (!due.length) return;
    this.dueText = this.add
      .text(W / 2, H - 14, `Collection this morning: ${due.join(', ')}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#f2f2f2',
      })
      .setOrigin(0.5);
  }

  flashMorning() {
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x101828).setAlpha(0.75);
    this.tweens.add({ targets: veil, alpha: 0, duration: 700, onComplete: () => veil.destroy() });
  }
}

export const SIZE = { W, H };
