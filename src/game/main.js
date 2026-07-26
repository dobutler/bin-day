import Phaser from 'phaser';
import { Street, SIZE } from './scenes/Street.js';

export function startGame(parent, state) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: SIZE.W,
    height: SIZE.H,
    parent,
    backgroundColor: '#c7d4dd',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: [Street],
    callbacks: {
      // The shared game state goes into the registry before any scene boots.
      // Street reads it in init(). Calling scene.start() by hand here (or
      // straight after `new Phaser.Game`) races the boot sequence.
      preBoot: (game) => game.registry.set('state', state),
    },
  });
}
