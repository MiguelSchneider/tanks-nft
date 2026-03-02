// ── PARTICLES ─────────────────────────────────────────────────────────────────
import { particles, ctx, W, H } from './state.js';
import { sfxExplode, sfxRepair, sfxCrumble, sfxFuel } from './audio.js';
import { hexToRgb } from './utils.js';

export function spawnExplosion(x, y, color) {
  sfxExplode();
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, spd = 0.5 + Math.random() * 5, deb = Math.random() < 0.35;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: deb ? 80 + Math.random() * 60 : 30 + Math.random() * 40,
      color: Math.random() < 0.5 ? color : `rgb(255,${140 + Math.random() * 115 | 0},0)`,
      size: deb ? 1.5 + Math.random() * 3 : 3 + Math.random() * 8, isDebris: deb, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.2 });
  }
  const [r, g, b] = hexToRgb(color);
  particles.push({ x, y, vx: 0, vy: 0, life: 22, maxLife: 22, isRing: true, r, g, b, ringR: 0 });
}

export function spawnHitSpark(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 12 + Math.random() * 12, color, size: 1 + Math.random() * 2, isDebris: false });
  }
}

export function spawnRepairEffect(x, y) {
  sfxRepair();
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 2.5;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 25 + Math.random() * 20, color: '#4f8', size: 2 + Math.random() * 3, isDebris: false });
  }
  particles.push({ x, y, vx: 0, vy: 0, life: 18, maxLife: 18, isRing: true, r: 80, g: 220, b: 100, ringR: 0 });
}

export function spawnObstacleExplosion(x, y, w, h) {
  sfxCrumble();
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 4;
    particles.push({ x: x + (Math.random() * w - w / 2), y: y + (Math.random() * h - h / 2), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 50 + Math.random() * 60, color: Math.random() < 0.5 ? '#8B7355' : (Math.random() < 0.5 ? '#555' : '#332'), size: 2 + Math.random() * 6, isDebris: true, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.2 });
  }
  particles.push({ x, y, vx: 0, vy: 0, life: 20, maxLife: 20, isRing: true, r: 160, g: 120, b: 60, ringR: 0 });
}

export function spawnFuelEffect(x, y) {
  sfxFuel();
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 2.5;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 25 + Math.random() * 20, color: '#fa8', size: 2 + Math.random() * 3, isDebris: false });
  }
  particles.push({ x, y, vx: 0, vy: 0, life: 18, maxLife: 18, isRing: true, r: 255, g: 160, b: 20, ringR: 0 });
}

export function spawnDust(x, y) {
  if (Math.random() > 0.4) return;
  particles.push({ x, y, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, life: 20 + Math.random() * 20, color: `rgba(${150 + Math.random() * 50 | 0},${130 + Math.random() * 40 | 0},${80 + Math.random() * 30 | 0},0.4)`, size: 4 + Math.random() * 8, isDebris: false });
}

export function updateParticles() {
  let i = particles.length;
  while (i--) {
    const p = particles[i];
    p.life--;
    if (p.isRing) { p.ringR += 5; if (p.life <= 0) { particles.splice(i, 1); } continue; }
    p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95;
    if (p.isDebris) p.rot += p.rotV;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(camX, camY) {
  particles.forEach(p => {
    const sx = p.x - camX + W() / 2, sy = p.y - camY + H() / 2;
    if (sx < -80 || sx > W() + 80 || sy < -80 || sy > H() + 80) return;
    const alpha = Math.max(0, p.life / 80);
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha);
    if (p.isRing) {
      ctx.beginPath(); ctx.arc(sx, sy, p.ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`; ctx.lineWidth = 3 * (1 - p.ringR / 100); ctx.stroke();
    } else if (p.isDebris) {
      ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size);
      grd.addColorStop(0, 'rgba(255,255,255,0.8)'); grd.addColorStop(0.3, p.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}
