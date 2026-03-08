// ── GALLERY ENTRY POINT ─────────────────────────────────────────────────────
// Bootstraps the NFT gallery page. No API key needed — uses standard Solana RPC.

import { fetchCollectionNFTs } from './gallery-fetch.js'
import { renderGallery, setupFilters, showLoading, showError } from './gallery-ui.js'

// Hide the API key bar — no longer needed
document.getElementById('apiKeyBar').style.display = 'none'

loadGallery()

async function loadGallery() {
  showLoading('Scanning Solana devnet for collection NFTs...')

  try {
    const nfts = await fetchCollectionNFTs((msg) => {
      showLoading(msg)
    })

    renderGallery(nfts)
    setupFilters()
  } catch (err) {
    console.error('[gallery]', err)
    showError(`Failed to load NFTs: ${err.message}`)
  }
}
