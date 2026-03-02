// ── INPUT ─────────────────────────────────────────────────────────────────────
import { keys } from './state.js';

// onQuit callback passed from init.js to avoid importing game.js here
export function setupInput(onQuit) {
  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (e.key === 'q' || e.key === 'Q') onQuit();
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });
}
