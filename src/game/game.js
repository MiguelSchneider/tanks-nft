// ── GAME LOOP ─────────────────────────────────────────────────────────────────
import {
  ctx, W, H, WORLD,
  tanks, bullets, obstacles, repairKits, fuelKits, particles,
  gameState, getPlayerGene, getBots,
} from './state.js';
import { Tank } from './entities.js';
import { generateGround, generateObstacles, generateRepairKits, generateFuelKits, drawGround, updateRepairKits, updateFuelKits } from './world.js';
import { updateParticles, drawParticles, spawnDust, spawnHitSpark } from './particles.js';
import { sfxBump } from './audio.js';
import { dist } from './utils.js';
import { updateLobbyUI } from './lobby.js';

// Segment vs circle intersection (handles fast-bullet tunneling)
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
  const a = dx*dx + dy*dy;
  if (a < 1e-6) return false;
  const b = 2*(fx*dx + fy*dy), c = fx*fx + fy*fy - r*r;
  const disc = b*b - 4*a*c;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc), t1 = (-b - sq) / (2*a), t2 = (-b + sq) / (2*a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

export function startGame() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('preBattle').style.display = 'none';
  tanks.length = 0; bullets.length = 0; particles.length = 0; fuelKits.length = 0;
  gameState.kitRespawnTimer = 0; gameState.fuelKitRespawnTimer = 0;

  generateGround(); generateObstacles(); generateRepairKits(); generateFuelKits();

  const playerGene = getPlayerGene();
  const bots = getBots();
  tanks.push(new Tank(0, 'You', playerGene, false));
  bots.forEach((b, i) => tanks.push(new Tank(i + 1, b.name, b.gene, true)));

  const sp = [[400, 400], [WORLD - 400, 400], [400, WORLD - 400], [WORLD - 400, WORLD - 400], [WORLD / 2, WORLD / 2]];
  tanks.forEach((t, i) => { t.x = sp[i % sp.length][0]; t.y = sp[i % sp.length][1]; t.angle = Math.random() * Math.PI * 2; t.turretAngle = t.angle; });

  const hEl = document.getElementById('hud'); hEl.innerHTML = ''; gameState.hudRefs = {};
  tanks.forEach(t => {
    const col = t.id === 0 ? '#fa0' : t.gene.bodyColor;
    const d = document.createElement('div'), nm = document.createElement('div'), hp = document.createElement('div'),
          bg = document.createElement('div'), br = document.createElement('div'), kl = document.createElement('div');
    d.className = 'player-hud'; d.style.borderColor = col + '55';
    nm.className = 'player-name'; nm.style.color = col; nm.textContent = t.name;
    hp.className = 'hud-stat'; bg.className = 'health-bar-bg'; br.className = 'health-bar'; kl.className = 'hud-stat';
    bg.appendChild(br);
    let flbg = null, flbr = null;
    if (t.gene.maxFuel != null) {
      flbg = document.createElement('div'); flbr = document.createElement('div');
      flbg.className = 'fuel-bar-bg'; flbr.className = 'fuel-bar';
      flbg.appendChild(flbr);
      d.append(nm, hp, bg, flbg, kl);
    } else {
      d.append(nm, hp, bg, kl);
    }
    hEl.appendChild(d);
    gameState.hudRefs[t.id] = { nm, hp, br, flbg, flbr, kl };
  });

  gameState.animId = requestAnimationFrame(gameLoop);
}

export function gameLoop() {
  gameState.animId = requestAnimationFrame(gameLoop);
  const player = tanks[0], camTarget = player.alive ? player : tanks.find(t => t.alive);
  const camX = camTarget ? camTarget.x : WORLD / 2, camY = camTarget ? camTarget.y : WORLD / 2;

  drawGround(camX, camY);
  updateRepairKits();
  updateFuelKits();

  tanks.forEach(t => {
    t.update();
    if (t.thrustDir !== 0) spawnDust(t.x + (Math.random() - 0.5) * 30, t.y + (Math.random() - 0.5) * 30);
  });

  bullets.forEach(b => b.update());

  // Bullets vs obstacles
  bullets.forEach(b => {
    if (!b.alive) return;
    obstacles.forEach(ob => {
      if (!ob.alive) return;
      if (ob.intersectsLine(b.prevX, b.prevY, b.x, b.y)) { ob.takeDamage(b.damage, b.x, b.y); spawnHitSpark(b.x, b.y, '#a87'); b.alive = false; }
    });
  });

  // Bullets vs tanks (point check + swept segment-circle to prevent tunneling)
  bullets.forEach(b => {
    if (!b.alive) return;
    tanks.forEach(t => {
      if (!t.alive || t.id === b.ownerId) return;
      if (dist(b, t) < t.radius || segCircle(b.prevX, b.prevY, b.x, b.y, t.x, t.y, t.radius)) {
        b.alive = false; t.takeDamage(b.damage, b.ownerId);
      }
    });
  });

  // Remove dead bullets
  let i = bullets.length;
  while (i--) { if (!bullets[i].alive) bullets.splice(i, 1); }

  // Tank-tank collisions
  for (let a = 0; a < tanks.length; a++) {
    for (let b = a + 1; b < tanks.length; b++) {
      const ta = tanks[a], tb = tanks[b];
      if (!ta.alive || !tb.alive) continue;
      const r = ta.radius + tb.radius, d = dist(ta, tb);
      if (d < r && d > 0.01) {
        const nx = (tb.x - ta.x) / d, ny = (tb.y - ta.y) / d, ov = (r - d) / 2;
        ta.x -= nx * ov; ta.y -= ny * ov; tb.x += nx * ov; tb.y += ny * ov;
        ta.vx *= 0.3; ta.vy *= 0.3; tb.vx *= 0.3; tb.vy *= 0.3;
        sfxBump();
      }
    }
  }

  updateParticles();

  obstacles.forEach(ob => ob.draw(camX, camY));
  repairKits.forEach(k => k.draw(camX, camY));
  fuelKits.forEach(k => k.draw(camX, camY));
  drawParticles(camX, camY);
  bullets.forEach(b => b.draw(camX, camY));
  tanks.forEach(t => t.draw(camX, camY));
  drawMinimap(camX, camY);
  updateHUD();

  if (!player.alive) {
    ctx.fillStyle = 'rgba(255,200,80,0.8)'; ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`Respawning in ${Math.ceil(player.respawnTimer / 60)}s...`, W() / 2, 50);
  }

  const winner = tanks.find(t => t.kills >= 5);
  if (winner) endGame(winner);
}

function drawMinimap(camX, camY) {
  const mm = 150, mx = W() - mm - 12, my = H() - mm - 12;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,5,0.8)'; ctx.strokeStyle = 'rgba(255,200,50,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(mx, my, mm, mm, 6); ctx.fill(); ctx.stroke();
  obstacles.forEach(ob => {
    if (!ob.alive) return;
    const p = ob.pct;
    ctx.fillStyle = `rgba(${150 - 100 * (1 - p) | 0},${120 - 80 * (1 - p) | 0},60,0.7)`;
    ctx.fillRect(mx + (ob.x / WORLD) * mm - (ob.w / WORLD * mm / 2), my + (ob.y / WORLD) * mm - (ob.h / WORLD * mm / 2), Math.max(2, (ob.w / WORLD) * mm), Math.max(2, (ob.h / WORLD) * mm));
  });
  repairKits.forEach(k => {
    if (!k.alive) return;
    ctx.fillStyle = '#4f8'; ctx.beginPath(); ctx.arc(mx + (k.x / WORLD) * mm, my + (k.y / WORLD) * mm, 3, 0, Math.PI * 2); ctx.fill();
  });
  fuelKits.forEach(k => {
    if (!k.alive) return;
    ctx.fillStyle = '#fa0'; ctx.beginPath(); ctx.arc(mx + (k.x / WORLD) * mm, my + (k.y / WORLD) * mm, 2.5, 0, Math.PI * 2); ctx.fill();
  });
  tanks.forEach(t => {
    if (!t.alive) return;
    ctx.beginPath(); ctx.arc(mx + (t.x / WORLD) * mm, my + (t.y / WORLD) * mm, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = t.id === 0 ? '#fa0' : t.gene.bodyColor; ctx.fill();
  });
  ctx.strokeStyle = 'rgba(255,200,50,0.6)';
  ctx.strokeRect(mx + (camX - W() / 2) / WORLD * mm, my + (camY - H() / 2) / WORLD * mm, W() / WORLD * mm, H() / WORLD * mm);
  ctx.restore();
}

function updateHUD() {
  tanks.forEach(t => {
    const r = gameState.hudRefs[t.id]; if (!r) return;
    const pct = t.alive ? (t.hp / t.gene.maxHp * 100).toFixed(0) : 0;
    r.nm.textContent = t.name + (t.alive ? '' : ' 💀');
    r.hp.textContent = 'HP: ' + pct + '%';
    r.br.style.width = pct + '%'; r.br.style.background = +pct > 50 ? '#4f4' : '#f84';
    if (r.flbr) {
      const fp = (t.fuel / t.gene.maxFuel * 100).toFixed(0);
      r.flbr.style.width = fp + '%';
      r.flbr.style.background = +fp > 50 ? '#fa0' : +fp > 25 ? '#f60' : '#f00';
    }
    r.kl.textContent = 'Kills: ' + t.kills + ' / 5 ★';
  });
}

export function endGame(winner) {
  cancelAnimationFrame(gameState.animId);
  const go = document.getElementById('gameOver'); go.style.display = 'flex';
  const sorted = [...tanks].sort((a, b) => b.kills - a.kills);
  document.getElementById('scoreboard').innerHTML =
    `<div class="score-row" style="font-weight:bold;color:#fa0"><span>🏆 Winner</span><span>${winner.name}</span></div>` +
    sorted.map(t => `<div class="score-row"><span>${t.name}</span><span>${t.kills} kills</span></div>`).join('');
}

export function returnToLobby() {
  cancelAnimationFrame(gameState.animId);
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('lobby').style.display = 'flex';
  updateLobbyUI();
}
