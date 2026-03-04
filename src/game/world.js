// ── WORLD ─────────────────────────────────────────────────────────────────────
import { ctx, W, H, WORLD, obstacles, repairKits, fuelKits, groundTiles, gameState } from './state.js';
import { Obstacle, RepairKit, FuelKit } from './entities.js';
import { rand, randi } from './utils.js';

export function generateObstacles() {
  obstacles.length = 0;
  const fixed = [
    { x: 600, y: 600, w: 90, h: 28, hp: 200 }, { x: 600, y: 628, w: 28, h: 90, hp: 200 },
    { x: WORLD - 600, y: 600, w: 90, h: 28, hp: 200 }, { x: WORLD - 628, y: 628, w: 28, h: 90, hp: 200 },
    { x: 600, y: WORLD - 600, w: 28, h: 90, hp: 200 }, { x: 600, y: WORLD - 628, w: 90, h: 28, hp: 200 },
    { x: WORLD - 600, y: WORLD - 600, w: 90, h: 28, hp: 200 }, { x: WORLD - 628, y: WORLD - 628, w: 28, h: 90, hp: 200 },
    { x: WORLD / 2, y: WORLD / 2 - 60, w: 130, h: 28, hp: 160 }, { x: WORLD / 2, y: WORLD / 2 + 60, w: 130, h: 28, hp: 160 },
    { x: WORLD / 2 - 60, y: WORLD / 2, w: 28, h: 130, hp: 160 }, { x: WORLD / 2 + 60, y: WORLD / 2, w: 28, h: 130, hp: 160 },
  ];
  fixed.forEach(l => obstacles.push(new Obstacle(l.x, l.y, l.w, l.h, l.hp)));
  const maxObstacles =  20 + Math.floor(100 * Math.random());;
  for (let i = 0; i < maxObstacles; i++) obstacles.push(new Obstacle(300 + Math.random() * (WORLD - 600), 300 + Math.random() * (WORLD - 600), 20 + Math.random() * 55, 20 + Math.random() * 55, 60 + Math.random() * 110));
}

export function generateRepairKits() {
  repairKits.length = 0;
  [[WORLD * 0.25, WORLD * 0.25], [WORLD * 0.75, WORLD * 0.25], [WORLD * 0.25, WORLD * 0.75], [WORLD * 0.75, WORLD * 0.75],
   [WORLD * 0.5, WORLD * 0.2], [WORLD * 0.5, WORLD * 0.8], [WORLD * 0.2, WORLD * 0.5], [WORLD * 0.8, WORLD * 0.5], [WORLD * 0.5, WORLD * 0.5]]
    .forEach(([x, y]) => repairKits.push(new RepairKit(x, y)));
}

export function updateRepairKits() {
  gameState.kitRespawnTimer++;
  if (gameState.kitRespawnTimer > 600) {
    gameState.kitRespawnTimer = 0;
    repairKits.forEach(k => { if (!k.alive) { k.alive = true; k.age = 0; } });
  }
  repairKits.forEach(k => k.update());
}

export function generateFuelKits() {
  fuelKits.length = 0;
  [
    [WORLD * 0.35, WORLD * 0.35], [WORLD * 0.65, WORLD * 0.35],
    [WORLD * 0.35, WORLD * 0.65], [WORLD * 0.65, WORLD * 0.65],
    [WORLD * 0.5,  WORLD * 0.3],  [WORLD * 0.5,  WORLD * 0.7],
    [WORLD * 0.3,  WORLD * 0.5],  [WORLD * 0.7,  WORLD * 0.5],
  ].forEach(([x, y]) => fuelKits.push(new FuelKit(x, y)));
}

export function updateFuelKits() {
  gameState.fuelKitRespawnTimer++;
  if (gameState.fuelKitRespawnTimer > 900) {
    gameState.fuelKitRespawnTimer = 0;
    fuelKits.forEach(k => { if (!k.alive) { k.alive = true; k.age = 0; k.pct = 0.2 + Math.random() * 0.8; } });
  }
  fuelKits.forEach(k => k.update());
}

export function generateGround() {
  groundTiles.length = 0;
  for (let i = 0; i < 120; i++) groundTiles.push({ x: Math.random() * WORLD, y: Math.random() * WORLD, r: 30 + Math.random() * 80, col: `rgba(${40 + Math.random() * 20 | 0},${35 + Math.random() * 15 | 0},${20 + Math.random() * 10 | 0},0.3)` });
}

export function drawGround(camX, camY) {
  ctx.fillStyle = '#2a2510'; ctx.fillRect(0, 0, W(), H());
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  const gs = 100, ox = ((-camX + W() / 2) % gs + gs) % gs, oy = ((-camY + H() / 2) % gs + gs) % gs;
  for (let gx = ox; gx < W(); gx += gs) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H()); ctx.stroke(); }
  for (let gy = oy; gy < H(); gy += gs) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W(), gy); ctx.stroke(); }
  groundTiles.forEach(t => {
    const sx = t.x - camX + W() / 2, sy = t.y - camY + H() / 2;
    if (sx < -100 || sx > W() + 100 || sy < -100 || sy > H() + 100) return;
    ctx.fillStyle = t.col; ctx.beginPath(); ctx.arc(sx, sy, t.r, 0, Math.PI * 2); ctx.fill();
  });
  const bx = -camX + W() / 2, by = -camY + H() / 2;
  ctx.strokeStyle = 'rgba(255,100,0,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(bx, by, WORLD, WORLD);
}
