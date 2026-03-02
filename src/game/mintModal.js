// ── MINT PROGRESS MODAL ───────────────────────────────────────────────────────
import { walletState } from '../wallet.js';
import { gameState, getPlayerGene } from './state.js';
import { renderTankNFTImage } from './renderer.js';
import { calcRarity } from './gene.js';
import { sfxMintSuccess } from './audio.js';
import { showToast } from './toast.js';

let _mpmStep = 0;
let _mpmPngDataUrl = null;

export function openMintModal(tankName) {
  _mpmStep = 0; _mpmPngDataUrl = null;
  document.getElementById('mpmSubtitle').textContent = tankName;
  const card = document.getElementById('mpmCard');
  card.className = 'mpm-card';
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('mpmStep' + i).className = 'mpm-step';
    document.getElementById('mpmIcon' + i).innerHTML = i;
  });
  document.getElementById('mpmSub2').textContent = '';
  document.getElementById('mpmSub3').textContent = '';
  document.getElementById('mpmSub4').textContent = 'Approve transaction in Phantom';
  document.getElementById('mintProgressModal').classList.add('open');
}

export function closeMintModal() {
  document.getElementById('mintProgressModal').classList.remove('open');
}

function _mpmSetActive(n) {
  for (let i = _mpmStep; i < n; i++) {
    if (i > 0) {
      document.getElementById('mpmStep' + i).className = 'mpm-step done';
      document.getElementById('mpmIcon' + i).innerHTML = '✓';
    }
  }
  _mpmStep = n;
  document.getElementById('mpmStep' + n).className = 'mpm-step active';
  document.getElementById('mpmIcon' + n).innerHTML = '<span class="mpm-spinner">↻</span>';
}

export function updateMintProgress(msg) {
  if      (msg.includes('Rendering'))       _mpmSetActive(1);
  else if (msg.includes('Uploading image')) _mpmSetActive(2);
  else if (msg.includes('metadata'))        _mpmSetActive(3);
  else if (msg.includes('signature') || msg.includes('on-chain')) _mpmSetActive(4);
  else if (_mpmStep === 2) document.getElementById('mpmSub2').textContent = msg;
  else if (_mpmStep === 3) document.getElementById('mpmSub3').textContent = msg;
}

function _mpmShowSuccess(result, pngDataUrl) {
  _mpmPngDataUrl = pngDataUrl;
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('mpmStep' + i).className = 'mpm-step done';
    document.getElementById('mpmIcon' + i).innerHTML = '✓';
  });
  const card = document.getElementById('mpmCard');
  card.className = 'mpm-card success';
  const rarity = calcRarity(result.gene);
  const img = document.getElementById('mpmSuccessImg');
  img.src = pngDataUrl;
  img.style.borderColor = rarity.color + '88';
  img.style.boxShadow   = `0 0 28px ${rarity.color}33`;
  document.getElementById('mpmSuccessInfo').innerHTML =
    `<b style="color:#fff">${result.name}</b><br>` +
    `Rarity: <span style="color:${rarity.color}">${rarity.label}</span><br>` +
    `Mint: <span style="color:#555">${result.mintAddress}</span>`;
  document.getElementById('mpmDownloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.download = result.name.replace(/\s+/g, '-') + '.png';
    a.href = pngDataUrl; a.click();
  };
}

function _mpmShowError(errMsg) {
  document.getElementById('mpmCard').className = 'mpm-card error';
  document.getElementById('mpmErrorMsg').textContent = errMsg;
}

// onNFTStripUpdate callback passed from init.js to avoid circular import
export async function mintCurrentTank(onNFTStripUpdate) {
  if (!walletState.connected) { showToast('Connect your wallet first!', 2000, '#f84'); return; }
  if (!window.mintCurrentTankReal) { showToast('Loading modules…', 1500, '#aaa'); return; }
  if (gameState.isMinting) return;
  gameState.isMinting = true;

  const name = document.getElementById('tankNameInput').value.trim() || 'Tank #001';
  const gene = { ...getPlayerGene() };
  const mintBtn = document.getElementById('mintBtn');
  mintBtn.disabled = true; mintBtn.textContent = '⏳ Minting…';
  openMintModal(name);

  let pngDataUrl = null;
  function resetBtn() { gameState.isMinting = false; mintBtn.disabled = false; mintBtn.textContent = '⬡ Mint NFT'; }

  window.mintCurrentTankReal(
    gene, name,
    (g, n) => { const c = renderTankNFTImage(g, n); pngDataUrl = c.toDataURL('image/png'); return c; },
    (msg) => updateMintProgress(msg),
    (result) => {
      const newNFT = { name: result.name, gene: result.gene, mintAddress: result.mintAddress, imageUrl: result.imageUrl, rarity: result.rarity, mintedAt: result.mintedAt };
      walletState.nfts.push(newNFT);  // optimistic — chain fetch on next connect will verify
      sfxMintSuccess();
      _mpmShowSuccess(result, pngDataUrl);
      onNFTStripUpdate();
      resetBtn();
    },
    (errMsg) => { _mpmShowError(errMsg); resetBtn(); }
  );
}
