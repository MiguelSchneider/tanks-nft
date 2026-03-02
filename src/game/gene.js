// ── GENE SYSTEM ───────────────────────────────────────────────────────────────
import { rand, randi, randHsl, shadeColor } from './utils.js';

export const BODY_SHAPE_NAMES = ['Chamfered', 'Hexagonal', 'Wedge', 'Brick', 'Armored', 'Teardrop'];
export const TURRET_NAMES     = ['Round', 'Square', 'Hex', 'Diamond', 'Soft Square'];
export const BARREL_NAMES     = ['Standard', 'Double', 'Sniper', 'Howitzer', 'Triple'];
export const TRACK_NAMES      = ['Standard', 'Heavy Skirt', 'Narrow'];

export const BODY_SHAPES = [
  (c, hw, hh) => { c.beginPath(); c.moveTo(-hw + 6, -hh); c.lineTo(hw - 6, -hh); c.lineTo(hw, -hh + 6); c.lineTo(hw, hh); c.lineTo(-hw, hh); c.lineTo(-hw, -hh + 6); c.closePath(); },
  (c, hw, hh) => { c.beginPath(); c.moveTo(0, -hh - 4); c.lineTo(hw, -hh * 0.4); c.lineTo(hw, hh * 0.4); c.lineTo(0, hh + 4); c.lineTo(-hw, hh * 0.4); c.lineTo(-hw, -hh * 0.4); c.closePath(); },
  (c, hw, hh) => { c.beginPath(); c.moveTo(-hw * 0.5, -hh); c.lineTo(hw * 0.5, -hh); c.lineTo(hw, 0); c.lineTo(hw * 0.6, hh); c.lineTo(-hw * 0.6, hh); c.lineTo(-hw, 0); c.closePath(); },
  (c, hw, hh) => { c.beginPath(); c.roundRect(-hw, -hh, hw * 2, hh * 2, 8); },
  (c, hw, hh) => { c.beginPath(); c.moveTo(-hw * 0.4, -hh); c.lineTo(hw * 0.4, -hh); c.lineTo(hw * 0.4, -hh * 0.4); c.lineTo(hw, -hh * 0.4); c.lineTo(hw, hh * 0.4); c.lineTo(hw * 0.4, hh * 0.4); c.lineTo(hw * 0.4, hh); c.lineTo(-hw * 0.4, hh); c.lineTo(-hw * 0.4, hh * 0.4); c.lineTo(-hw, hh * 0.4); c.lineTo(-hw, -hh * 0.4); c.lineTo(-hw * 0.4, -hh * 0.4); c.closePath(); },
  (c, hw, hh) => { c.beginPath(); c.moveTo(0, -hh - 2); c.bezierCurveTo(hw + 4, -hh * 0.2, hw, hh * 0.6, 0, hh + 2); c.bezierCurveTo(-hw, hh * 0.6, -hw - 4, -hh * 0.2, 0, -hh - 2); c.closePath(); },
];

export const TURRET_SHAPES = [
  (c, r) => { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); },
  (c, r) => { c.beginPath(); c.rect(-r, -r, r * 2, r * 2); },
  (c, r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - Math.PI / 6; i === 0 ? c.moveTo(Math.cos(a) * r, Math.sin(a) * r) : c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); },
  (c, r) => { c.beginPath(); c.moveTo(0, -r * 1.2); c.lineTo(r, 0); c.lineTo(0, r * 1.2); c.lineTo(-r, 0); c.closePath(); },
  (c, r) => { c.beginPath(); c.roundRect(-r, -r, r * 2, r * 2, r * 0.4); },
];

export const BARREL_STYLES = [
  (c, g) => { const w = g.barrelW, L = g.barrelLen; c.fillRect(-w / 2, -L, w, L); c.fillStyle = shadeColor(g.turretColor, -25); c.fillRect(-w / 2 - 1, -L, 3, 8); c.fillRect(w / 2 - 2, -L, 3, 8); },
  (c, g) => { const w = g.barrelW * 0.65, L = g.barrelLen, sep = g.barrelW; for (const sx of [-sep, sep]) { c.fillRect(sx - w / 2, -L, w, L); } c.fillStyle = shadeColor(g.turretColor, -25); for (const sx of [-sep, sep]) { c.fillRect(sx - w / 2 - 1, -L, 3, 6); c.fillRect(sx + w / 2 - 2, -L, 3, 6); } },
  (c, g) => { const w = g.barrelW * 0.7, L = g.barrelLen * 1.5; c.fillRect(-w / 2, -L, w, L); c.fillStyle = shadeColor(g.turretColor, -30); c.fillRect(-w / 2 - 2, -L, w + 4, 10); c.fillRect(-w / 2 - 2, -L - 14, w + 4, 10); },
  (c, g) => { const w = g.barrelW * 1.5, L = g.barrelLen * 0.8; c.fillRect(-w / 2, -L, w, L); c.fillStyle = shadeColor(g.turretColor, -20); c.fillRect(-w / 2 - 3, -L, 6, 12); c.fillRect(w / 2 - 3, -L, 6, 12); },
  (c, g) => { const w = g.barrelW * 0.5, L = g.barrelLen * 0.9; [-0.18, 0, 0.18].forEach(a => { c.save(); c.rotate(a); c.fillRect(-w / 2, -L, w, L); c.restore(); }); },
];

export const TRACK_STYLES = [
  (c, g, hw, hh, off) => {
    for (const sx of [-1, 1]) {
      const tx = sx * (hw + g.trackW / 2 + 2);
      c.fillStyle = g.trackColor; c.fillRect(tx - g.trackW / 2, -hh - 2, g.trackW, hh * 2 + 4);
      c.save(); c.beginPath(); c.rect(tx - g.trackW / 2, -hh - 2, g.trackW, hh * 2 + 4); c.clip();
      c.fillStyle = shadeColor(g.trackColor, 32);
      const step = 8, phase = ((off % step) + step) % step;
      for (let t = -hh - 2 - step + phase; t <= hh + 2 + step; t += step) c.fillRect(tx - g.trackW / 2, t, g.trackW, 3);
      c.restore();
      c.fillStyle = shadeColor(g.trackColor, 55);
      for (const wy of [-hh + 6, 0, hh - 6]) { c.beginPath(); c.arc(tx, wy, g.trackW * 0.38, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = shadeColor(g.trackColor, 85);
      for (const wy of [-hh + 6, 0, hh - 6]) { c.beginPath(); c.arc(tx, wy, g.trackW * 0.16, 0, Math.PI * 2); c.fill(); }
    }
  },
  (c, g, hw, hh, off) => {
    for (const sx of [-1, 1]) {
      const tx = sx * (hw + g.trackW / 2 + 3);
      c.fillStyle = shadeColor(g.bodyColor, -18); c.fillRect(tx - g.trackW / 2 - 3, -hh, g.trackW + 6, hh * 2);
      c.fillStyle = g.trackColor; c.fillRect(tx - g.trackW / 2, -hh - 3, g.trackW, hh * 2 + 6);
      c.save(); c.beginPath(); c.rect(tx - g.trackW / 2, -hh - 3, g.trackW, hh * 2 + 6); c.clip();
      c.fillStyle = shadeColor(g.trackColor, 28);
      const step = 7, phase = ((off % step) + step) % step;
      for (let t = -hh - 3 - step + phase; t <= hh + 3 + step; t += step) c.fillRect(tx - g.trackW / 2, t, g.trackW, 3);
      c.restore();
      c.fillStyle = shadeColor(g.trackColor, 65);
      for (const wy of [-hh + 5, -hh * 0.3, hh * 0.3, hh - 5]) { c.beginPath(); c.arc(tx, wy, g.trackW * 0.35, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = shadeColor(g.trackColor, 90);
      for (const wy of [-hh + 5, -hh * 0.3, hh * 0.3, hh - 5]) { c.beginPath(); c.arc(tx, wy, g.trackW * 0.13, 0, Math.PI * 2); c.fill(); }
    }
  },
  (c, g, hw, hh, off) => {
    for (const sx of [-1, 1]) {
      const tx = sx * (hw + g.trackW / 2 + 1);
      c.fillStyle = g.trackColor; c.fillRect(tx - g.trackW / 2, -hh + 4, g.trackW, hh * 2 - 8);
      c.beginPath(); c.arc(tx, -hh + 4, g.trackW / 2, Math.PI, 0); c.fill();
      c.beginPath(); c.arc(tx, hh - 4, g.trackW / 2, 0, Math.PI); c.fill();
      c.save(); c.beginPath(); c.rect(tx - g.trackW / 2, -hh + 4, g.trackW, hh * 2 - 8); c.clip();
      c.strokeStyle = shadeColor(g.trackColor, 42); c.lineWidth = 2;
      const step = 6, phase = ((off % step) + step) % step;
      for (let t = -hh + 4 - step + phase; t < hh - 4 + step; t += step) { c.beginPath(); c.moveTo(tx - g.trackW / 2 + 1, t); c.lineTo(tx + g.trackW / 2 - 1, t); c.stroke(); }
      c.restore();
      c.fillStyle = shadeColor(g.trackColor, 60);
      c.beginPath(); c.arc(tx, -hh + 4, g.trackW * 0.35, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(tx, hh - 4, g.trackW * 0.35, 0, Math.PI * 2); c.fill();
    }
  },
];

export function createGene(overrides = {}) {
  const hue = randi(0, 360);
  return {
    maxHp: rand(65, 180), moveSpeed: rand(1.0, 3.2), rotSpeed: rand(0.018, 0.058),
    turretSpeed: rand(0.04, 0.10), fireRate: rand(0.8, 3.5), bulletSpd: rand(4.5, 10), bulletDmg: rand(14, 52),
    maxFuel: rand(800, 2400),
    bodyW: rand(16, 26), bodyH: rand(20, 34), bodyShape: randi(0, BODY_SHAPES.length - 1),
    turretR: rand(7, 13), turretShape: randi(0, TURRET_SHAPES.length - 1),
    barrelStyle: randi(0, BARREL_STYLES.length - 1), barrelW: rand(4, 9), barrelLen: rand(18, 30),
    trackW: rand(7, 13), trackStyle: randi(0, TRACK_STYLES.length - 1),
    bodyColor: randHsl(hue, hue + 20, 50 + randi(0, 20), 30 + randi(0, 20)),
    turretColor: randHsl(hue + 5, hue + 25, 45 + randi(0, 20), 25 + randi(0, 20)),
    trackColor: randHsl(0, 30, 0, 10 + randi(0, 15)),
    ...overrides
  };
}

export function genePreset(type) {
  if (type === 'heavy')  return createGene({ maxHp: 175, moveSpeed: 1.0, rotSpeed: 0.02, bulletDmg: 48, bodyW: 25, bodyH: 33, trackW: 13, trackStyle: 1, bodyShape: 4 });
  if (type === 'speed')  return createGene({ maxHp: 68, moveSpeed: 3.2, rotSpeed: 0.055, turretSpeed: 0.1, fireRate: 3.2, bodyW: 16, bodyH: 22, trackW: 7, trackStyle: 2 });
  if (type === 'sniper') return createGene({ bulletSpd: 10, bulletDmg: 50, barrelStyle: 2, barrelLen: 30, fireRate: 1.0, bodyShape: 5 });
  return createGene();
}

export function calcRarity(gene) {
  const score = (gene.maxHp / 180 + gene.moveSpeed / 3.2 + gene.bulletDmg / 52 + gene.bulletSpd / 10) / 4;
  if (score > 0.80) return { label: 'Legendary', color: '#FFD700' };
  if (score > 0.65) return { label: 'Epic',      color: '#A855F7' };
  if (score > 0.50) return { label: 'Rare',      color: '#3B82F6' };
  if (score > 0.35) return { label: 'Uncommon',  color: '#22C55E' };
  return               { label: 'Common',    color: '#9CA3AF' };
}
