// ── NFT STRIP ─────────────────────────────────────────────────────────────────
import { walletState } from '../wallet.js';
import { gameState, setPlayerGene } from './state.js';
import { renderTankNFTImage } from './renderer.js';
import { calcRarity } from './gene.js';
import { showToast } from './toast.js';

export function updateNFTStrip() {
  const strip = document.getElementById('nftStrip');
  const grid  = document.getElementById('nftGrid');
  const count = document.getElementById('nftCount');
  if (!walletState.connected) { strip.style.display = 'none'; return; }
  if (walletState.nftsLoading) {
    strip.style.display = 'block';
    count.textContent = '';
    grid.innerHTML = '<div style="padding:8px 0 4px;color:#555;font-size:11px;font-family:\'Courier New\',monospace;">Loading from chain…</div>';
    return;
  }
  if (walletState.nfts.length === 0) { strip.style.display = 'none'; return; }
  strip.style.display = 'block';
  count.textContent = `(${walletState.nfts.length})`;
  grid.innerHTML = '';
  walletState.nfts.forEach((nft, i) => {
    const card = document.createElement('div');
    card.className = 'nft-card' + (gameState.selectedNFTIndex === i ? ' selected' : '');
    card.title = nft.name;
    try {
      const thumb = renderTankNFTImage(nft.gene, nft.name);
      thumb.style.cssText = 'width:72px;height:72px;border-radius:4px;';
      const rarity = calcRarity(nft.gene);
      const dot = document.createElement('div');
      dot.className = 'nft-rarity-dot'; dot.style.background = rarity.color;
      const nameEl = document.createElement('div'); nameEl.className = 'nft-card-name'; nameEl.textContent = nft.name;
      card.append(dot, thumb, nameEl);
    } catch (e) {
      console.warn('NFT render error:', nft.name, e);
      card.style.cssText = 'width:72px;height:72px;display:flex;align-items:center;justify-content:center;color:#555;font-size:10px;text-align:center;';
      card.textContent = nft.name;
    }
    card.onclick = () => window.selectNFT(i);
    grid.appendChild(card);
  });
  const hint = document.createElement('div');
  hint.style.cssText = 'display:flex;align-items:center;justify-content:center;width:72px;height:72px;border:1px dashed rgba(255,255,255,0.12);border-radius:6px;color:#444;font-size:22px;cursor:default;';
  hint.textContent = '+';
  grid.appendChild(hint);
}

// onLobbyUpdate callback is passed from init.js to avoid circular import
export function selectNFT(i, onLobbyUpdate) {
  gameState.selectedNFTIndex = i;
  const nft = walletState.nfts[i];
  setPlayerGene({ ...nft.gene });
  document.getElementById('tankNameInput').value = nft.name;
  updateNFTStrip();
  onLobbyUpdate();
  showToast(`Tank "${nft.name}" selected`, 1800, '#fa0');
}
