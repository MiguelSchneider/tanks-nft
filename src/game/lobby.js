// ── LOBBY ─────────────────────────────────────────────────────────────────────
import { walletState } from '../wallet.js';
import { getPlayerGene, setPlayerGene, getBots, setBots, gameState } from './state.js';
import { createGene, genePreset, calcRarity } from './gene.js';
import { drawTankAt, showNFTPreview, renderTankNFTImage } from './renderer.js';
import { shortenAddr, randomTankName } from './utils.js';

export function initLobby() {
  setPlayerGene(createGene());
  setBots([
    { name: 'Panzer', gene: createGene() },
    { name: 'Blitz',  gene: createGene() },
  ]);
  const nameInput = document.getElementById('tankNameInput');
  if (nameInput) nameInput.value = randomTankName();
  updateLobbyUI();
}

export function randomizeGene(t) {
  setPlayerGene(t ? genePreset(t) : createGene());
  gameState.selectedNFTIndex = null;
  const nameInput = document.getElementById('tankNameInput');
  if (nameInput) nameInput.value = randomTankName(t);
  updateLobbyUI();
}

export function previewNFT() {
  const idx = gameState.selectedNFTIndex;
  if (idx !== null && walletState.nfts[idx]) {
    _showNFTOnChain(walletState.nfts[idx]);
  } else {
    const name = document.getElementById('tankNameInput')?.value.trim() || 'Tank #001';
    showNFTPreview(getPlayerGene(), name);
  }
}

function _showNFTOnChain(nft) {
  const existing = document.getElementById('nftModal'); if (existing) existing.remove();
  const modal = document.createElement('div'); modal.id = 'nftModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;z-index:20;';
  const rarity = calcRarity(nft.gene);
  const nftCanvas = renderTankNFTImage(nft.gene, nft.name);
  nftCanvas.style.cssText = `border-radius:12px;border:2px solid ${rarity.color}44;box-shadow:0 0 40px ${rarity.color}33;max-width:90vmin;max-height:60vmin;`;
  const title = document.createElement('div');
  title.style.cssText = `font-size:13px;letter-spacing:3px;font-family:Courier New;color:${rarity.color};`;
  title.textContent = nft.name + ' — ' + rarity.label.toUpperCase();
  const info = document.createElement('div');
  info.style.cssText = 'font-size:11px;color:#555;font-family:Courier New;text-align:center;';
  info.textContent = 'Mint: ' + nft.mintAddress;
  const mkLink = (text, url) => {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = text;
    a.style.cssText = 'font-family:Courier New;font-size:12px;color:#14F195;text-decoration:underline;cursor:pointer;';
    return a;
  };
  const links = document.createElement('div'); links.style.cssText = 'display:flex;gap:16px;';
  links.append(
    mkLink('⎆ Solana Explorer', `https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`),
    mkLink('⎆ Solscan', `https://solscan.io/token/${nft.mintAddress}?cluster=devnet`),
  );
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);color:#aaa;padding:9px 20px;border-radius:6px;cursor:pointer;font-family:Courier New;font-size:13px;';
  closeBtn.onclick = () => modal.remove();
  modal.append(title, nftCanvas, info, links, closeBtn);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

export function openPreBattle() {
  const gene = getPlayerGene();
  const name = document.getElementById('tankNameInput')?.value.trim() || 'Tank #001';

  const pbCanvas = document.getElementById('pbTankCanvas');
  const pbCtx = pbCanvas.getContext('2d');
  pbCtx.fillStyle = '#1a1a0a'; pbCtx.fillRect(0, 0, 100, 100);
  pbCtx.strokeStyle = 'rgba(255,255,255,0.05)'; pbCtx.lineWidth = 1;
  for (let g = 0; g < 100; g += 20) {
    pbCtx.beginPath(); pbCtx.moveTo(g, 0); pbCtx.lineTo(g, 100); pbCtx.stroke();
    pbCtx.beginPath(); pbCtx.moveTo(0, g); pbCtx.lineTo(100, g); pbCtx.stroke();
  }
  drawTankAt(pbCtx, gene, 50, 50, 0, 0, 0);

  document.getElementById('pbTankName').textContent = name;
  const rarity = calcRarity(gene);
  const rarEl = document.getElementById('pbRarity');
  rarEl.textContent = '◆ ' + rarity.label.toUpperCase();
  rarEl.style.color = rarity.color;

  const stats = [
    ['HP',         gene.maxHp      / 180],
    ['Speed',      gene.moveSpeed  / 3.2],
    ['Rotation',   gene.rotSpeed   / 0.058],
    ['Fire Rate',  gene.fireRate   / 3.5],
    ['Bullet Spd', gene.bulletSpd  / 10],
    ['Damage',     gene.bulletDmg  / 52],
    ...(gene.maxFuel != null ? [['Fuel Tank', gene.maxFuel / 2400]] : []),
  ];
  document.getElementById('pbStats').innerHTML = stats.map(([n, v]) =>
    `<div class="gene-stat">${n}: <span>${Math.min(100, v * 100 | 0)}%</span><div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.min(100, v * 100 | 0)}%"></div></div></div>`
  ).join('');

  updateLobbyUI();
  document.getElementById('preBattle').style.display = 'flex';
}

export function closePreBattle() {
  document.getElementById('preBattle').style.display = 'none';
}

export function addBot() {
  const bots = getBots();
  if (bots.length >= 5) return;
  const names = ['Rommel', 'Tiger', 'T-34', 'Abrams', 'Leopard'];
  bots.push({ name: names[bots.length] || `Bot${bots.length + 1}`, gene: createGene() });
  updateLobbyUI();
}

export function removeBot() {
  const bots = getBots();
  if (bots.length <= 1) return;
  bots.pop();
  updateLobbyUI();
}

export function updateLobbyUI() {
  const gc = document.getElementById('tankPreview'), gctx = gc.getContext('2d');
  gctx.fillStyle = '#1a1a0a'; gctx.fillRect(0, 0, 140, 140);
  gctx.strokeStyle = 'rgba(255,255,255,0.05)'; gctx.lineWidth = 1;
  for (let g = 0; g < 140; g += 20) { gctx.beginPath(); gctx.moveTo(g, 0); gctx.lineTo(g, 140); gctx.stroke(); gctx.beginPath(); gctx.moveTo(0, g); gctx.lineTo(140, g); gctx.stroke(); }
  const playerGene = getPlayerGene();
  drawTankAt(gctx, playerGene, 70, 70, 0, 0, 0);
  const stats = [
    ['HP', playerGene.maxHp / 180],
    ['Speed', playerGene.moveSpeed / 3.2],
    ['Rotation', playerGene.rotSpeed / 0.058],
    ['Fire Rate', playerGene.fireRate / 3.5],
    ['Bullet Spd', playerGene.bulletSpd / 10],
    ['Damage', playerGene.bulletDmg / 52],
    ...(playerGene.maxFuel != null ? [['Fuel Tank', playerGene.maxFuel / 2400]] : []),
  ];
  document.getElementById('geneStats').innerHTML = stats.map(([n, v]) =>
    `<div class="gene-stat">${n}: <span>${Math.min(100, v * 100 | 0)}%</span><div class="stat-bar-wrap"><div class="stat-bar" style="width:${Math.min(100, v * 100 | 0)}%"></div></div></div>`
  ).join('');
  const bots = getBots();
  document.getElementById('playerList').innerHTML =
    `<div class="player-entry"><div class="player-dot" style="background:${playerGene.bodyColor}"></div><span>You${walletState.connected ? ' (' + shortenAddr(walletState.address) + ')' : ' (no wallet)'}</span></div>` +
    bots.map(b => `<div class="player-entry"><div class="player-dot" style="background:${b.gene.bodyColor}"></div><span>${b.name} (Bot)</span></div>`).join('');
  const isNFTSelected = gameState.selectedNFTIndex !== null;
  const mintBtn = document.getElementById('mintBtn');
  if (mintBtn) {
    mintBtn.disabled = isNFTSelected || !walletState.connected;
    mintBtn.title = isNFTSelected
      ? 'Using an existing NFT — randomize to create a new one'
      : walletState.connected ? '' : 'Connect wallet to mint';
  }
}
