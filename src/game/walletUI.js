// ── WALLET UI ─────────────────────────────────────────────────────────────────
import { walletState } from '../wallet.js';
import { shortenAddr } from './utils.js';
import { showToast } from './toast.js';

export function toggleWallet() {
  if (!window.disconnectWallet) { showToast('Loading wallet module…', 1500, '#aaa'); return; }
  if (walletState.connected) {
    window.disconnectWallet();
  } else {
    showToast('Connecting to Phantom…', 2000, '#9945FF');
    window.connectWallet().catch(e => {
      if (e.code === 4001) showToast('Connection rejected by user.', 2500, '#f84');
      else showToast('Connection error: ' + e.message, 3000, '#f84');
    });
  }
}

export function updateWalletUI() {
  const btn    = document.getElementById('walletBtn');
  const addrEl = document.getElementById('walletAddress');
  const balEl  = document.getElementById('walletBalance');
  if (walletState.connected) {
    btn.textContent = 'Disconnect'; btn.className = 'wallet-btn connected';
    addrEl.textContent = shortenAddr(walletState.address);
    balEl.textContent  = walletState.balance + ' SOL (devnet)';
    balEl.style.display = 'block';
  } else {
    btn.textContent = 'Connect Wallet'; btn.className = 'wallet-btn';
    addrEl.textContent = 'Not connected'; balEl.style.display = 'none';
  }
}

// Called by init.js with callbacks to avoid circular imports
export function setupWalletEvents(onConnected, onDisconnected) {
  window.addEventListener('walletConnected',    () => { updateWalletUI(); showToast(`✓ Connected: ${shortenAddr(walletState.address)}`, 2500, '#14F195'); document.getElementById('mintBtn').disabled = false; onConnected(); });
  window.addEventListener('walletDisconnected', () => { updateWalletUI(); showToast('Wallet disconnected.', 2000, '#aaa'); document.getElementById('mintBtn').disabled = true; onDisconnected(); });
  window.addEventListener('walletChanged',      () => { updateWalletUI(); showToast(`✓ Connected: ${shortenAddr(walletState.address)}`, 2500, '#14F195'); document.getElementById('mintBtn').disabled = false; onConnected(); });
}
