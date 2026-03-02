// ── GAME INIT ─────────────────────────────────────────────────────────────────
// Orchestration: imports all game modules, wires callbacks, exposes window.*
// globals so index.html onclick handlers continue to work.

import { toggleWallet, setupWalletEvents } from './walletUI.js';
import { updateNFTStrip, selectNFT } from './nftStrip.js';
import { openMintModal, closeMintModal, mintCurrentTank } from './mintModal.js';
import { initLobby, updateLobbyUI, randomizeGene, previewNFT, addBot, removeBot, openPreBattle, closePreBattle } from './lobby.js';
import { startGame, returnToLobby } from './game.js';
import { setupInput } from './input.js';

// Wire wallet events with UI callbacks
setupWalletEvents(
  () => { updateNFTStrip(); updateLobbyUI(); },  // onConnected
  () => { updateNFTStrip(); updateLobbyUI(); },  // onDisconnected
);

// Update strip while chain fetch is in progress and when it completes
window.addEventListener('nftsLoading', () => updateNFTStrip());
window.addEventListener('nftsLoaded',  () => { updateNFTStrip(); updateLobbyUI(); });

// Wire selectNFT with lobby update callback
window.selectNFT = (i) => selectNFT(i, updateLobbyUI);

// Wire mintCurrentTank with NFT strip callback
window.mintCurrentTank = () => mintCurrentTank(updateNFTStrip);

// Expose all functions referenced by HTML onclick attributes
window.toggleWallet   = toggleWallet;
window.randomizeGene  = randomizeGene;
window.previewNFT     = previewNFT;
window.addBot         = addBot;
window.removeBot      = removeBot;
window.openPreBattle  = openPreBattle;
window.closePreBattle = closePreBattle;
window.startGame      = startGame;
window.returnToLobby  = returnToLobby;
window.closeMintModal = closeMintModal;
window.openMintModal  = openMintModal;

// Setup keyboard input
setupInput(returnToLobby);

// Initialize lobby UI on load
initLobby();
