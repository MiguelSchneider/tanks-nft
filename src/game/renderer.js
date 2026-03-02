// ── RENDERER ─────────────────────────────────────────────────────────────────
import { shadeColor, hexToRgb, lerpColor } from './utils.js';
import {
  BODY_SHAPES, TURRET_SHAPES, BARREL_STYLES, TRACK_STYLES,
  BODY_SHAPE_NAMES, TURRET_NAMES, BARREL_NAMES, TRACK_NAMES,
  calcRarity,
} from './gene.js';

export function drawTankAt(c, g, cx, cy, bodyAngle, turretAngle, flashPct = 0, trackOffset = 0) {
  const hw = g.bodyW, hh = g.bodyH;
  c.save(); c.translate(cx, cy);
  c.save(); c.globalAlpha = 0.22; c.fillStyle = '#000'; c.beginPath(); c.ellipse(4, 6, hw + g.trackW + 6, hh + 5, bodyAngle, 0, Math.PI * 2); c.fill(); c.restore();
  c.save(); c.rotate(bodyAngle); TRACK_STYLES[g.trackStyle](c, g, hw, hh, trackOffset); c.restore();
  c.save(); c.rotate(bodyAngle);
  const bg = c.createLinearGradient(-hw, -hh, hw, hh);
  bg.addColorStop(0, shadeColor(g.bodyColor, 45)); bg.addColorStop(0.45, g.bodyColor); bg.addColorStop(1, shadeColor(g.bodyColor, -35));
  c.fillStyle = bg; BODY_SHAPES[g.bodyShape](c, hw, hh); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.5; BODY_SHAPES[g.bodyShape](c, hw, hh); c.stroke();
  const sh = c.createLinearGradient(-hw * 0.6, -hh * 0.8, 0, 0); sh.addColorStop(0, 'rgba(255,255,255,0.15)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh; BODY_SHAPES[g.bodyShape](c, hw, hh); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(-hw * 0.45, -hh * 0.72, hw * 0.9, 4);
  c.fillStyle = 'rgba(80,220,255,0.25)'; c.fillRect(-hw * 0.43, -hh * 0.70, hw * 0.86, 2);
  c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(-hw * 0.38, hh * 0.70, hw * 0.30, 5); c.fillRect(hw * 0.08, hh * 0.70, hw * 0.30, 5);
  if (flashPct > 0) { c.globalAlpha = flashPct * 0.5; c.fillStyle = '#fff'; BODY_SHAPES[g.bodyShape](c, hw, hh); c.fill(); c.globalAlpha = 1; }
  c.restore();
  c.save(); c.rotate(turretAngle);
  c.fillStyle = g.turretColor; BARREL_STYLES[g.barrelStyle](c, g);
  const tg = c.createRadialGradient(-g.turretR * 0.3, -g.turretR * 0.3, 0, 0, 0, g.turretR * 1.3);
  tg.addColorStop(0, shadeColor(g.turretColor, 40)); tg.addColorStop(0.6, g.turretColor); tg.addColorStop(1, shadeColor(g.turretColor, -30));
  c.fillStyle = tg; TURRET_SHAPES[g.turretShape](c, g.turretR); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.3; TURRET_SHAPES[g.turretShape](c, g.turretR); c.stroke();
  c.beginPath(); c.arc(0, g.turretR * 0.15, g.turretR * 0.35, 0, Math.PI * 2); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
  c.restore();
  c.restore();
}

export function renderTankNFTImage(gene, tankName) {
  const SIZE = 512;
  const oc = document.createElement('canvas'); oc.width = SIZE; oc.height = SIZE;
  const c = oc.getContext('2d');
  const bg = c.createRadialGradient(256, 210, 0, 256, 256, 320);
  bg.addColorStop(0, '#1e1e3a'); bg.addColorStop(0.5, '#0d0d1f'); bg.addColorStop(1, '#050508');
  c.fillStyle = bg; c.fillRect(0, 0, SIZE, SIZE);
  c.strokeStyle = 'rgba(255,255,255,0.03)'; c.lineWidth = 1;
  for (let i = 0; i < SIZE; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, SIZE); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(SIZE, i); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
  [[20, 20], [SIZE - 20, 20], [20, SIZE - 20], [SIZE - 20, SIZE - 20]].forEach(([hx, hy]) => {
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - Math.PI / 6; i === 0 ? c.moveTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14) : c.lineTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14); } c.closePath(); c.stroke();
  });
  for (let i = 0; i < 80; i++) { c.globalAlpha = 0.15 + Math.random() * 0.55; c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.random() * SIZE, Math.random() * SIZE, Math.random() * 1.4, 0, Math.PI * 2); c.fill(); }
  c.globalAlpha = 1;
  const rarity = calcRarity(gene);
  const gr = hexToRgb(rarity.color);
  const glowO = c.createRadialGradient(256, 230, 0, 256, 230, 170);
  glowO.addColorStop(0, `rgba(${gr[0]},${gr[1]},${gr[2]},0.18)`); glowO.addColorStop(0.5, `rgba(${gr[0]},${gr[1]},${gr[2]},0.07)`); glowO.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = glowO; c.beginPath(); c.ellipse(256, 230, 170, 170, 0, 0, Math.PI * 2); c.fill();
  const shd = c.createRadialGradient(256, 310, 0, 256, 310, 90); shd.addColorStop(0, 'rgba(0,0,0,0.55)'); shd.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = shd; c.beginPath(); c.ellipse(256, 310, 90, 28, 0, 0, Math.PI * 2); c.fill();
  const SCALE = 2.8; c.save(); c.scale(SCALE, SCALE); drawTankAt(c, gene, 256 / SCALE, 220 / SCALE, 0, 0, 0); c.restore();
  const cardY = 355, cardGrd = c.createLinearGradient(0, cardY, 0, SIZE);
  cardGrd.addColorStop(0, 'rgba(0,0,0,0)'); cardGrd.addColorStop(0.25, 'rgba(0,0,0,0.75)'); cardGrd.addColorStop(1, 'rgba(0,0,0,0.92)');
  c.fillStyle = cardGrd; c.fillRect(0, cardY, SIZE, SIZE - cardY);
  const badgeX = 256, badgeY = 375, bw = 110, bh = 22;
  c.fillStyle = rarity.color + '33'; c.strokeStyle = rarity.color; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(badgeX - bw / 2, badgeY - bh / 2, bw, bh, 11); c.fill(); c.stroke();
  c.fillStyle = rarity.color; c.font = 'bold 12px Courier New'; c.textAlign = 'center'; c.fillText('★ ' + rarity.label.toUpperCase() + ' ★', badgeX, badgeY + 4.5);
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.font = 'bold 26px Courier New'; c.textAlign = 'center'; c.fillText(tankName, 256, 415);
  const statPills = [{ label: 'HP', val: Math.round(gene.maxHp) }, { label: 'SPD', val: gene.moveSpeed.toFixed(1) }, { label: 'DMG', val: Math.round(gene.bulletDmg) }, { label: 'RATE', val: gene.fireRate.toFixed(1) }, ...(gene.maxFuel != null ? [{ label: 'FUEL', val: Math.round(gene.maxFuel) }] : [])];
  const pillW = 88, pillH = 28, pillGap = 8, totalW = statPills.length * (pillW + pillGap) - pillGap;
  let px = 256 - totalW / 2;
  statPills.forEach(p => {
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1; c.beginPath(); c.roundRect(px, 436, pillW, pillH, 6); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,200,80,0.7)'; c.font = '9px Courier New'; c.textAlign = 'center'; c.fillText(p.label, px + pillW / 2, 448);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = 'bold 13px Courier New'; c.fillText(p.val, px + pillW / 2, 462);
    px += pillW + pillGap;
  });
  const traits = [BODY_SHAPE_NAMES[gene.bodyShape], TURRET_NAMES[gene.turretShape], BARREL_NAMES[gene.barrelStyle], TRACK_NAMES[gene.trackStyle]];
  let tx = 20, ty = 500; c.font = '10px Courier New';
  traits.forEach(t => {
    const tw = c.measureText(t).width + 14;
    if (tx + tw > SIZE - 20) { tx = 20; ty += 18; }
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1; c.beginPath(); c.roundRect(tx, ty - 12, tw, 16, 4); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.textAlign = 'left'; c.fillText(t, tx + 7, ty); tx += tw + 6;
  });
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.strokeRect(1, 1, SIZE - 2, SIZE - 2);
  return oc;
}

export function showNFTPreview(gene, name) {
  const existing = document.getElementById('nftModal'); if (existing) existing.remove();
  const modal = document.createElement('div'); modal.id = 'nftModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:20;';
  const rarity = calcRarity(gene);
  const nftCanvas = renderTankNFTImage(gene, name);
  nftCanvas.style.cssText = `border-radius:12px;border:2px solid ${rarity.color}44;box-shadow:0 0 40px ${rarity.color}33;max-width:90vmin;max-height:65vmin;`;
  const title = document.createElement('div'); title.style.cssText = `font-size:13px;letter-spacing:3px;font-family:Courier New;color:${rarity.color};`; title.textContent = 'NFT PREVIEW — ' + rarity.label.toUpperCase();
  const note = document.createElement('div'); note.style.cssText = 'font-size:11px;color:#666;font-family:Courier New;text-align:center;max-width:400px;line-height:1.7;';
  note.innerHTML = 'This is exactly how your NFT will look on Magic Eden and Tensor.<br>Connect your Phantom wallet and click <b style="color:#fa0">⬡ Mint NFT</b> to create it on Solana.';
  const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;gap:12px;';
  const dlBtn = document.createElement('button'); dlBtn.textContent = '⬇ Download PNG'; dlBtn.style.cssText = 'background:rgba(255,200,80,0.12);border:1px solid #fa0;color:#fa0;padding:9px 20px;border-radius:6px;cursor:pointer;font-family:Courier New;font-size:13px;';
  dlBtn.onclick = () => { const a = document.createElement('a'); a.download = name.replace(/\s+/g, '-') + '.png'; a.href = nftCanvas.toDataURL('image/png'); a.click(); };
  const closeBtn = document.createElement('button'); closeBtn.textContent = '✕ Close'; closeBtn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);color:#aaa;padding:9px 20px;border-radius:6px;cursor:pointer;font-family:Courier New;font-size:13px;';
  closeBtn.onclick = () => modal.remove();
  btnRow.append(dlBtn, closeBtn); modal.append(title, nftCanvas, note, btnRow);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
