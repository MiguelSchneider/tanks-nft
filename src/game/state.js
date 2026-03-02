// ── SHARED STATE ─────────────────────────────────────────────────────────────
// All mutable game state lives here. Modules import what they need.
// Arrays are never reassigned — use arr.length = 0 + push() to reset them.

export const canvas = document.getElementById('canvas');
export const ctx    = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

export const W = () => canvas.width;
export const H = () => canvas.height;

export const WORLD = 2400;

// Entity arrays — cleared and repopulated on each new game
export const tanks      = [];
export const bullets    = [];
export const obstacles  = [];
export const repairKits = [];
export const fuelKits   = [];
export const particles  = [];
export const groundTiles = [];

// Key input state
export const keys = {};

// Misc game state
export const gameState = {
  animId:               null,
  kitRespawnTimer:      0,
  fuelKitRespawnTimer:  0,
  isMinting:            false,
  selectedNFTIndex:     null,
  hudRefs:              {},
};

// Lobby state — set by lobby.js on init
let _playerGene = null;
let _bots       = [];

export function getPlayerGene() { return _playerGene; }
export function setPlayerGene(g) { _playerGene = g; }
export function getBots() { return _bots; }
export function setBots(b) { _bots = b; }
