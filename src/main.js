import { newGame } from './game/systems/state.js';
import { startGame } from './game/main.js';
import { mountOverlay } from './ui/overlay.js';
import { showSetup } from './ui/setup.js';

// Wrapped in a function rather than using top-level await, which needs a
// newer build target than the default.
async function boot() {
  const ui = document.querySelector('#ui');
  const stage = document.querySelector('.stage');

  // Pick your local bin scheme first, then boot the game with it.
  stage.style.display = 'none';
  const setup = await showSetup(ui);
  stage.style.display = '';

  const state = newGame(Date.now() % 1000000, setup);
  const game = startGame('game', state);
  mountOverlay(state, ui);

  // Handy in the console while developing: window.bd.state
  window.bd = { state, game };
}

boot();
