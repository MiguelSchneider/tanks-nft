// ── ENTITIES ─────────────────────────────────────────────────────────────────
import { ctx, W, H, WORLD, obstacles, repairKits, fuelKits, tanks, bullets, keys } from './state.js';
import { sfxFire, sfxHit, sfxBump, sfxRespawn } from './audio.js';
import { spawnExplosion, spawnHitSpark, spawnRepairEffect, spawnFuelEffect, spawnObstacleExplosion } from './particles.js';
import { drawTankAt } from './renderer.js';
import { dist, angleDiff, hexToRgb } from './utils.js';

// ── REPAIR KIT ───────────────────────────────────────────────────────────────
export class RepairKit {
  constructor(x, y) { this.x = x; this.y = y; this.r = 14; this.alive = true; this.age = 0; }
  update() { this.age++; }
  draw(camX, camY) {
    if (!this.alive) return;
    const sx = this.x - camX + W() / 2, sy = this.y - camY + H() / 2;
    if (sx < -60 || sx > W() + 60 || sy < -60 || sy > H() + 60) return;
    const pulse = 0.85 + 0.15 * Math.sin(this.age * 0.08), r = this.r * pulse;
    ctx.save();
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
    grd.addColorStop(0, 'rgba(80,255,120,0.22)'); grd.addColorStop(1, 'rgba(80,255,120,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(sx - r * 0.25, sy - r * 0.25, 0, sx, sy, r);
    bg.addColorStop(0, '#afffb8'); bg.addColorStop(0.5, '#2ec84a'); bg.addColorStop(1, '#1a7a2a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.55); ctx.lineTo(sx, sy + r * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - r * 0.55, sy); ctx.lineTo(sx + r * 0.55, sy); ctx.stroke();
    ctx.restore();
  }
}

// ── FUEL KIT ─────────────────────────────────────────────────────────────────
export class FuelKit {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 14; this.alive = true; this.age = 0;
    this.pct = 0.2 + Math.random() * 0.8; // 20–100% of tank's maxFuel
  }
  update() { this.age++; }
  draw(camX, camY) {
    if (!this.alive) return;
    const sx = this.x - camX + W() / 2, sy = this.y - camY + H() / 2;
    if (sx < -60 || sx > W() + 60 || sy < -60 || sy > H() + 60) return;
    const pulse = 0.85 + 0.15 * Math.sin(this.age * 0.08), r = this.r * pulse;
    ctx.save();

    // Outer glow
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
    grd.addColorStop(0, 'rgba(255,140,0,0.22)'); grd.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2); ctx.fill();

    // Main circle with amber gradient
    const bg = ctx.createRadialGradient(sx - r * 0.25, sy - r * 0.25, 0, sx, sy, r);
    bg.addColorStop(0, '#ffe08a'); bg.addColorStop(0.5, '#cc7000'); bg.addColorStop(1, '#7a3a00');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Fill level bar (shows how much fuel this kit provides)
    const bw = r * 1.3, bh = 3.5, bx = sx - bw / 2, by = sy + r * 0.48;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, bh);
    const fColor = this.pct > 0.65 ? '#7fff40' : this.pct > 0.35 ? '#ffcc00' : '#ff5500';
    ctx.fillStyle = fColor; ctx.fillRect(bx, by, bw * this.pct, bh);

    // Fuel drop icon
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    const dy = sy - r * 0.15;
    ctx.beginPath();
    ctx.moveTo(sx, dy - r * 0.42);
    ctx.bezierCurveTo(sx + r * 0.32, dy - r * 0.05, sx + r * 0.32, dy + r * 0.32, sx, dy + r * 0.38);
    ctx.bezierCurveTo(sx - r * 0.32, dy + r * 0.32, sx - r * 0.32, dy - r * 0.05, sx, dy - r * 0.42);
    ctx.fill();

    ctx.restore();
  }
}

// ── OBSTACLE ─────────────────────────────────────────────────────────────────
const MORTAR_COLOR = '#181a26';
const STONE_VARIANTS = [
  { base: '#5c6880', hi: '#8898b2', lo: '#353d55', mid: '#4c5870' },
  { base: '#606875', hi: '#84909e', lo: '#3a414e', mid: '#505668' },
  { base: '#58647a', hi: '#7888a2', lo: '#363f52', mid: '#485468' },
  { base: '#626070', hi: '#868490', lo: '#3e3e50', mid: '#525064' },
];

function drawStoneSprite(x, y, tw, th, pct, variant, cracks) {
  const dam = 1 - Math.max(0, Math.min(1, pct));
  const v = STONE_VARIANTS[variant % STONE_VARIANTS.length];
  const fx = Math.floor(x), fy = Math.floor(y), fw = Math.floor(tw), fh = Math.floor(th);
  const pad = 1;
  const sx = fx + pad, sy = fy + pad, sw = fw - pad * 2, sh = fh - pad * 2;
  if (sw < 1 || sh < 1) return;

  // Mortar background
  ctx.fillStyle = MORTAR_COLOR;
  ctx.fillRect(fx, fy, fw, fh);

  // Stone face (darkens with damage)
  const [br, bg, bb] = hexToRgb(v.base);
  const dk = dam * 0.45;
  ctx.fillStyle = `rgb(${Math.round(br*(1-dk))},${Math.round(bg*(1-dk))},${Math.round(bb*(1-dk))})`;
  ctx.fillRect(sx, sy, sw, sh);

  // Bevel highlights
  const bev = Math.max(1, Math.min(3, Math.floor(Math.min(sw, sh) / 5)));
  ctx.fillStyle = v.hi;
  ctx.fillRect(sx, sy, sw, bev);
  ctx.fillRect(sx, sy + bev, bev, sh - bev);
  ctx.fillStyle = v.lo;
  ctx.fillRect(sx, sy + sh - bev, sw, bev);
  ctx.fillRect(sx + sw - bev, sy + bev, bev, sh - bev * 2);

  // Interior stone detail lines (vary by variant)
  const ix = sx + bev + 1, iy = sy + bev + 1, iw = sw - bev * 2 - 2, ih = sh - bev * 2 - 2;
  if (iw > 3 && ih > 3) {
    ctx.fillStyle = v.mid;
    if (variant % 4 === 0) ctx.fillRect(ix, iy + Math.floor(ih * 0.5), Math.floor(iw * 0.6), 1);
    else if (variant % 4 === 1) ctx.fillRect(ix + Math.floor(iw * 0.5), iy, 1, Math.floor(ih * 0.6));
    else if (variant % 4 === 2) {
      ctx.fillRect(ix, iy + Math.floor(ih * 0.3), Math.floor(iw * 0.45), 1);
      ctx.fillRect(ix + Math.floor(iw * 0.5), iy + Math.floor(ih * 0.65), Math.floor(iw * 0.4), 1);
    }
  }

  // Damage stage 1: first crack (dam > 0.2)
  if (dam > 0.2) {
    const cr = cracks[0];
    const len = Math.floor(Math.min(sw, sh) * 0.5 * Math.min(1, (dam - 0.2) / 0.3));
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    for (let i = 0; i < len; i++)
      ctx.fillRect(Math.floor(sx + sw * cr.ox + Math.cos(cr.ang) * i), Math.floor(sy + sh * cr.oy + Math.sin(cr.ang) * i), 1, 1);
  }

  // Damage stage 2: second crack + chipped corner (dam > 0.45)
  if (dam > 0.45) {
    const cr = cracks[1];
    const len = Math.floor(Math.min(sw, sh) * 0.45 * Math.min(1, (dam - 0.45) / 0.3));
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    for (let i = 0; i < len; i++)
      ctx.fillRect(Math.floor(sx + sw * cr.ox + Math.cos(cr.ang) * i), Math.floor(sy + sh * cr.oy + Math.sin(cr.ang) * i), 1, 1);
    const chip = Math.floor(Math.min(sw, sh) * 0.28 * Math.min(1, (dam - 0.45) / 0.25));
    if (chip > 0) { ctx.fillStyle = MORTAR_COLOR; ctx.fillRect(sx + sw - chip, sy, chip, chip); }
  }

  // Damage stage 3: third crack + large chunk missing (dam > 0.7)
  if (dam > 0.7) {
    const cr = cracks[2];
    const len = Math.floor(Math.min(sw, sh) * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for (let i = 0; i < len; i++)
      ctx.fillRect(Math.floor(sx + sw * cr.ox + Math.cos(cr.ang) * i), Math.floor(sy + sh * cr.oy + Math.sin(cr.ang) * i), 1, 1);
    const chunkFrac = Math.min(1, (dam - 0.7) / 0.3);
    const cw = Math.floor(sw * 0.45 * chunkFrac), ch = Math.floor(sh * 0.45 * chunkFrac);
    if (cw > 0 && ch > 0) { ctx.fillStyle = MORTAR_COLOR; ctx.fillRect(sx, sy + sh - ch, cw, ch); }
  }
}

export class Obstacle {
  constructor(x, y, w, h, hp = 80) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.maxHp = hp; this.alive = true;
    this.cols = Math.max(1, Math.round(w / 20));
    this.rows = Math.max(1, Math.round(h / 20));
    this.tw = w / this.cols;
    this.th = h / this.rows;
    const n = this.cols * this.rows;
    this.cellMaxHp = hp / n;
    this.cells = Array.from({ length: n }, () => ({
      hp: hp / n, alive: true,
      variant: Math.floor(Math.random() * 4),
      cracks: Array.from({ length: 3 }, () => ({
        ox: 0.15 + Math.random() * 0.7,
        oy: 0.15 + Math.random() * 0.7,
        ang: Math.random() * Math.PI * 2,
      }))
    }));
  }

  get pct() { return this.cells.reduce((s, c) => s + c.hp, 0) / this.maxHp; }

  draw(camX, camY) {
    if (!this.alive) return;
    const sx = this.x - camX + W() / 2, sy = this.y - camY + H() / 2;
    if (sx < -this.w - 10 || sx > W() + this.w + 10 || sy < -this.h - 10 || sy > H() + this.h + 10) return;
    const ox = sx - this.w / 2, oy = sy - this.h / 2;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r * this.cols + c];
        if (!cell.alive) continue;
        drawStoneSprite(ox + c * this.tw, oy + r * this.th, this.tw, this.th, cell.hp / this.cellMaxHp, cell.variant, cell.cracks);
      }
    }
  }

  takeDamage(dmg, hitX, hitY) {
    if (!this.alive) return;
    let cell = null;
    if (hitX !== undefined && hitY !== undefined) {
      const c = Math.max(0, Math.min(this.cols - 1, Math.floor((hitX - (this.x - this.w / 2)) / this.tw)));
      const r = Math.max(0, Math.min(this.rows - 1, Math.floor((hitY - (this.y - this.h / 2)) / this.th)));
      const candidate = this.cells[r * this.cols + c];
      if (candidate && candidate.alive) cell = candidate;
    }
    if (!cell) {
      const alive = this.cells.filter(c => c.alive);
      if (alive.length) cell = alive[Math.floor(Math.random() * alive.length)];
    }
    if (!cell) return;
    cell.hp = Math.max(0, cell.hp - dmg);
    if (cell.hp <= 0) cell.alive = false;
    if (!this.cells.some(c => c.alive)) { this.alive = false; spawnObstacleExplosion(this.x, this.y, this.w, this.h); }
  }

  collides(px, py, pr) { return Math.abs(px - this.x) < this.w / 2 + pr && Math.abs(py - this.y) < this.h / 2 + pr; }
  resolveCircle(px, py, pr) { const dx = px - this.x, dy = py - this.y, ox = this.w / 2 + pr - Math.abs(dx), oy = this.h / 2 + pr - Math.abs(dy); return ox < oy ? { nx: Math.sign(dx), ny: 0, depth: ox } : { nx: 0, ny: Math.sign(dy), depth: oy }; }
  intersectsLine(x1, y1, x2, y2) {
    const hw = this.w / 2, hh = this.h / 2, lx = x2 - x1, ly = y2 - y1;
    let tmin = 0, tmax = 1;
    for (const [px, nx, half] of [[x1 - this.x, lx, hw], [y1 - this.y, ly, hh]]) {
      if (Math.abs(nx) < 1e-8) { if (Math.abs(px) > half) return false; }
      else { const t1 = (-half - px) / nx, t2 = (half - px) / nx; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2)); }
    }
    return tmin <= tmax;
  }
}

// ── BULLET ───────────────────────────────────────────────────────────────────
export class Bullet {
  constructor(x, y, angle, speed, damage, ownerId, color) {
    this.x = x; this.y = y; this.prevX = x; this.prevY = y;
    this.vx = Math.cos(angle - Math.PI / 2) * speed; this.vy = Math.sin(angle - Math.PI / 2) * speed;
    this.damage = damage; this.ownerId = ownerId; this.color = color;
    this.life = 130; this.alive = true; this.trail = [];
  }
  update() {
    this.prevX = this.x; this.prevY = this.y;
    this.x += this.vx; this.y += this.vy;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 8) this.trail.shift();
    this.life--; if (this.life <= 0) this.alive = false;
    const wx = ((this.x % WORLD) + WORLD) % WORLD, wy = ((this.y % WORLD) + WORLD) % WORLD;
    // If bullet wrapped, reset prev position to avoid a cross-world line that hits everything
    if (Math.abs(wx - this.x) > 1 || Math.abs(wy - this.y) > 1) { this.prevX = wx; this.prevY = wy; }
    this.x = wx; this.y = wy;
  }
  draw(camX, camY) {
    if (!this.alive) return;
    const sx = this.x - camX + W() / 2, sy = this.y - camY + H() / 2;
    if (sx < -50 || sx > W() + 50 || sy < -50 || sy > H() + 50) return;
    if (this.trail.length > 1) {
      ctx.save();
      const [r, g, b] = hexToRgb(this.color);
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x - camX + W() / 2, this.trail[i - 1].y - camY + H() / 2); ctx.lineTo(this.trail[i].x - camX + W() / 2, this.trail[i].y - camY + H() / 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${t * 0.6})`; ctx.lineWidth = t * 3; ctx.stroke();
      }
      ctx.restore();
    }
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
    grd.addColorStop(0, 'rgba(255,255,230,1)'); grd.addColorStop(0.3, this.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
  }
}

// ── TANK ─────────────────────────────────────────────────────────────────────
export class Tank {
  constructor(id, name, gene, isBot) {
    this.id = id; this.name = name; this.gene = gene; this.isBot = isBot;
    this.x = 500; this.y = 500; this.vx = 0; this.vy = 0;
    this.angle = Math.random() * Math.PI * 2; this.turretAngle = this.angle;
    this.hp = gene.maxHp; this.kills = 0; this.alive = true; this.respawnTimer = 0;
    // fuel: use gene.maxFuel if defined (new tanks), otherwise Infinity (backwards compat with old NFTs)
    this.fuel = (gene.maxFuel != null) ? gene.maxFuel : Infinity;
    this.fireCooldown = 0; this.flashTimer = 0; this.thrustDir = 0; this.trackOffset = 0;
    this.botThinkTimer = 0; this.botTargetAngle = undefined; this.botTurretTarget = undefined;
    this.botWantFire = false; this.botWantMove = 0; this.botEvadeTimer = 0; this.botEvadeAngle = 0;
  }
  get radius() { return Math.max(this.gene.bodyW, this.gene.bodyH) * 0.85; }
  update() {
    if (!this.alive) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) { this.alive = true; this.hp = this.gene.maxHp; this.fuel = (this.gene.maxFuel != null) ? this.gene.maxFuel : Infinity; this.vx = 0; this.vy = 0; this.x = 200 + Math.random() * (WORLD - 400); this.y = 200 + Math.random() * (WORLD - 400); sfxRespawn(); }
      return;
    }
    if (this.flashTimer > 0) this.flashTimer--; if (this.fireCooldown > 0) this.fireCooldown--; this.thrustDir = 0;
    if (this.isBot) this.updateBot(); else this.updateHuman();
    this.vx *= 0.80; this.vy *= 0.80; this.x += this.vx; this.y += this.vy;
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy); this.trackOffset += spd * (this.thrustDir >= 0 ? 1 : -1) * 1.4;
    this.x = ((this.x % WORLD) + WORLD) % WORLD; this.y = ((this.y % WORLD) + WORLD) % WORLD;
    let bumped = false;
    for (let iter = 0; iter < 3; iter++) {
      let resolved = false;
      obstacles.forEach(ob => {
        if (!ob.alive) return;
        if (ob.collides(this.x, this.y, this.radius)) {
          const res = ob.resolveCircle(this.x, this.y, this.radius);
          this.x += res.nx * res.depth; this.y += res.ny * res.depth;
          // Cancel velocity component pointing into the obstacle face
          const vd = this.vx * res.nx + this.vy * res.ny;
          if (vd < 0) { this.vx -= vd * res.nx; this.vy -= vd * res.ny; }
          resolved = true; bumped = true;
        }
      });
      if (!resolved) break;
    }
    if (bumped) { this.vx *= 0.3; this.vy *= 0.3; if (!this.isBot) sfxBump(); }
    repairKits.forEach(kit => {
      if (!kit.alive) return;
      if (dist(this, kit) < this.radius + kit.r) { const heal = this.gene.maxHp * 0.35; this.hp = Math.min(this.gene.maxHp, this.hp + heal); kit.alive = false; spawnRepairEffect(kit.x, kit.y); }
    });
    fuelKits.forEach(kit => {
      if (!kit.alive) return;
      if (dist(this, kit) < this.radius + kit.r) {
        if (isFinite(this.fuel)) this.fuel = Math.min(this.gene.maxFuel, this.fuel + kit.pct * this.gene.maxFuel);
        kit.alive = false; spawnFuelEffect(kit.x, kit.y);
      }
    });
  }
  updateHuman() {
    const g = this.gene; let bodyRot = 0;
    if (keys['ArrowLeft']) { this.angle -= g.rotSpeed; bodyRot = -g.rotSpeed; }
    if (keys['ArrowRight']) { this.angle += g.rotSpeed; bodyRot = g.rotSpeed; }
    this.turretAngle += bodyRot;
    if (keys['ArrowUp'] && this.fuel > 0) {
      this.vx += Math.cos(this.angle - Math.PI / 2) * g.moveSpeed * 0.3;
      this.vy += Math.sin(this.angle - Math.PI / 2) * g.moveSpeed * 0.3;
      this.thrustDir = 1;
      if (isFinite(this.fuel)) this.fuel = Math.max(0, this.fuel - 1);
    }
    if (keys['ArrowDown'] && this.fuel > 0) {
      this.vx -= Math.cos(this.angle - Math.PI / 2) * g.moveSpeed * 0.2;
      this.vy -= Math.sin(this.angle - Math.PI / 2) * g.moveSpeed * 0.2;
      this.thrustDir = -1;
      if (isFinite(this.fuel)) this.fuel = Math.max(0, this.fuel - 1);
    }
    const fineSpeed = g.rotSpeed * 0.35;
    if (keys['a'] || keys['A']) this.turretAngle -= fineSpeed;
    if (keys['d'] || keys['D']) this.turretAngle += fineSpeed;
    if (keys[' '] && this.fireCooldown <= 0) this.fire();
  }
  updateBot() {
    const g = this.gene; this.botThinkTimer--;
    if (this.botThinkTimer <= 0) {
      this.botThinkTimer = 10 + Math.floor(Math.random() * 8);
      const enemies = tanks.filter(t => t !== this && t.alive); if (!enemies.length) return;
      const target = enemies.reduce((b, t) => dist(this, t) < dist(this, b) ? t : b, enemies[0]);
      const d = dist(this, target);
      const wantsHeal = this.hp < this.gene.maxHp * 0.4;
      const nearKit = wantsHeal && repairKits.find(k => k.alive && dist(this, k) < 350);
      const wantsFuel = isFinite(this.fuel) && this.fuel < this.gene.maxFuel * 0.2;
      const nearFuelKit = wantsFuel && fuelKits.find(k => k.alive && dist(this, k) < 400);
      const dangerBullet = bullets.find(b => b.ownerId !== this.id && dist(b, this) < 100);
      if (dangerBullet) { this.botEvadeTimer = 30; this.botEvadeAngle = Math.atan2(this.y - dangerBullet.y, this.x - dangerBullet.x) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); }
      if (this.botEvadeTimer > 0) { this.botTargetAngle = this.botEvadeAngle; this.botWantMove = 1; }
      else if (nearKit) { this.botTargetAngle = Math.atan2(nearKit.y - this.y, nearKit.x - this.x) + Math.PI / 2; this.botWantMove = 1; this.botTurretTarget = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2; this.botWantFire = false; }
      else if (nearFuelKit) { this.botTargetAngle = Math.atan2(nearFuelKit.y - this.y, nearFuelKit.x - this.x) + Math.PI / 2; this.botWantMove = 1; this.botTurretTarget = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2; this.botWantFire = false; }
      else {
        const aimErr = (Math.random() - 0.5) * 0.28; this.botTurretTarget = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2 + aimErr;
        const moveAng = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2;
        if (d > 200) { this.botTargetAngle = moveAng; this.botWantMove = 1; }
        else if (d < 90) { this.botTargetAngle = moveAng + Math.PI; this.botWantMove = 1; }
        else { this.botWantMove = 0; }
        const da = angleDiff(this.turretAngle, this.botTurretTarget || this.turretAngle);
        this.botWantFire = Math.abs(da) < 0.3 && d < 500 && Math.random() < 0.65;
      }
    }
    if (this.botEvadeTimer > 0) this.botEvadeTimer--;
    let bodyRot = 0;
    if (this.botTargetAngle !== undefined) { const da = angleDiff(this.angle, this.botTargetAngle); if (da > 0.05) { this.angle += g.rotSpeed; bodyRot = g.rotSpeed; } else if (da < -0.05) { this.angle -= g.rotSpeed; bodyRot = -g.rotSpeed; } }
    this.turretAngle += bodyRot;
    if (this.botWantMove && this.fuel > 0) {
      this.vx += Math.cos(this.angle - Math.PI / 2) * g.moveSpeed * 0.3;
      this.vy += Math.sin(this.angle - Math.PI / 2) * g.moveSpeed * 0.3;
      this.thrustDir = 1;
      if (isFinite(this.fuel)) this.fuel = Math.max(0, this.fuel - 1);
    }
    if (this.botTurretTarget !== undefined) { const da = angleDiff(this.turretAngle, this.botTurretTarget); if (da > 0.04) this.turretAngle += g.turretSpeed; else if (da < -0.04) this.turretAngle -= g.turretSpeed; }
    if (this.botWantFire && this.fireCooldown <= 0) this.fire();
  }
  fire() {
    const g = this.gene;
    const bx = this.x + Math.cos(this.turretAngle - Math.PI / 2) * (g.turretR + g.barrelLen + 4);
    const by = this.y + Math.sin(this.turretAngle - Math.PI / 2) * (g.turretR + g.barrelLen + 4);
    bullets.push(new Bullet(bx, by, this.turretAngle, g.bulletSpd, g.bulletDmg, this.id, g.bodyColor));
    this.vx -= Math.cos(this.turretAngle - Math.PI / 2) * 0.5; this.vy -= Math.sin(this.turretAngle - Math.PI / 2) * 0.5;
    this.fireCooldown = 60 / g.fireRate; sfxFire();
  }
  takeDamage(dmg, shooterId) {
    this.hp -= dmg; this.flashTimer = 10;
    if (this.hp <= 0) {
      const s = tanks.find(t => t.id === shooterId); if (s) s.kills++;
      spawnExplosion(this.x, this.y, this.gene.bodyColor);
      this.alive = false; this.respawnTimer = 150;
    } else { spawnHitSpark(this.x, this.y, this.gene.bodyColor); sfxHit(); }
  }
  draw(camX, camY) {
    if (!this.alive) return;
    const sx = this.x - camX + W() / 2, sy = this.y - camY + H() / 2;
    if (sx < -120 || sx > W() + 120 || sy < -120 || sy > H() + 120) return;
    drawTankAt(ctx, this.gene, sx, sy, this.angle, this.turretAngle, this.flashTimer / 10, this.trackOffset);
    const bw = 54, bx = sx - bw / 2;
    if (this.hp < this.gene.maxHp) {
      const by = sy - this.gene.bodyH - 20;
      const p = this.hp / this.gene.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = p > 0.5 ? '#4f4' : '#f84'; ctx.fillRect(bx, by, bw * p, 5);
    }
    if (isFinite(this.fuel)) {
      const fp = this.fuel / this.gene.maxFuel;
      const by = sy - this.gene.bodyH - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = fp > 0.5 ? '#fa0' : fp > 0.25 ? '#f60' : '#f00';
      ctx.fillRect(bx, by, bw * fp, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(this.name + (this.kills ? ` [${this.kills}★]` : ''), sx, sy - this.gene.bodyH - 25);
  }
}
