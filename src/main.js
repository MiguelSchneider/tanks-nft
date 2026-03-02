import { connectWallet, disconnectWallet, autoReconnect, walletState, shortenAddr } from './wallet.js'
import './game/init.js'

// Expose wallet functions to HTML
window.connectWallet    = connectWallet
window.disconnectWallet = disconnectWallet
window.shortenAddr      = shortenAddr
window.walletState      = walletState

// Mint real: lazy-loads mint.js to avoid blocking wallet initialization
window.mintCurrentTankReal = async (gene, tankName, renderNFTImageFn, onProgress, onSuccess, onError) => {
  try {
    const { mintTankNFT } = await import('./mint.js')
    const result = await mintTankNFT(gene, tankName, renderNFTImageFn, onProgress)
    onSuccess?.(result)
  } catch (e) {
    console.error('Mint error:', e)
    onError?.(e.message || 'Error desconocido')
  }
}

// Load NFTs from Solana blockchain — lazy-loads fetchNFTs.js
async function loadChainNFTs(address) {
  walletState.nftsLoading = true
  window.dispatchEvent(new CustomEvent('nftsLoading'))
  try {
    const { fetchWalletNFTs } = await import('./fetchNFTs.js')
    const nfts = await fetchWalletNFTs(address)
    // Guard: wallet may have changed or disconnected while we were fetching
    if (walletState.connected && walletState.address === address) {
      walletState.nfts = nfts
    }
  } catch (e) {
    console.error('NFT chain fetch failed:', e)
    if (walletState.address === address) walletState.nfts = []
  } finally {
    if (walletState.address === address) {
      walletState.nftsLoading = false
      window.dispatchEvent(new CustomEvent('nftsLoaded'))
    }
  }
}

window.addEventListener('walletConnected',    () => loadChainNFTs(walletState.address))
window.addEventListener('walletChanged',      () => { if (walletState.connected) loadChainNFTs(walletState.address) })

// Auto-reconnect if a previous session exists
autoReconnect()
