import { newGame } from './game/systems/state.js';
import { startGame } from './game/main.js';
import { mountOverlay } from './ui/overlay.js';

const state = newGame();

// Phaser starts the first scene in its list automatically; the shared state
// travels via the registry rather than a manual scene.start().
const game = startGame('game', state);

mountOverlay(state, document.querySelector('#ui'));

// Handy in the console while developing: window.bd.state
window.bd = { state, game };
