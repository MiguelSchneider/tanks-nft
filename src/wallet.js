import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createAppKit } from '@reown/appkit'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solanaDevnet } from '@reown/appkit/networks'

// ── Reown AppKit Configuration ───────────────────────────────────────────────
const PROJECT_ID = '9d05d4b1b35fad1c007771dc63f9911d'

const solanaAdapter = new SolanaAdapter()

const appKit = createAppKit({
  adapters: [solanaAdapter],
  projectId: PROJECT_ID,
  networks: [solanaDevnet],
  metadata: {
    name: 'Tank Battle',
    description: 'Gene Warfare — 2D Tank Battle with Solana NFTs',
    url: window.location.origin,
    icons: [],
  },
})

// ── Solana Connection (devnet) ───────────────────────────────────────────────
let _conn = null
export function getConnection() {
  if (!_conn) _conn = new Connection(clusterApiUrl('devnet'), 'confirmed')
  return _conn
}

// ── Wallet State (same interface as before) ──────────────────────────────────
export const walletState = {
  connected: false,
  address: null,
  publicKey: null,
  balance: null,
  nfts: [],
  nftsLoading: false,
}

// ── Provider Access (for mint.js / Irys) ─────────────────────────────────────
let _solanaProvider = null

appKit.subscribeProviders(state => {
  _solanaProvider = state['solana'] ?? null
})

export function getProvider() {
  return _solanaProvider
}

// ── Connect / Disconnect ─────────────────────────────────────────────────────
export async function connectWallet() {
  appKit.open()
}

export async function disconnectWallet() {
  try { await appKit.getWalletProvider()?.disconnect?.() } catch (e) {}
  try { await appKit.adapter?.connectionControllerClient?.disconnect?.() } catch (e) {}
  Object.assign(walletState, {
    connected: false, address: null, publicKey: null, balance: null,
    nfts: [], nftsLoading: false,
  })
  window.dispatchEvent(new CustomEvent('walletDisconnected'))
}

// ── Subscribe to Account Changes ─────────────────────────────────────────────
appKit.subscribeAccount(async ({ address, isConnected }) => {
  if (isConnected && address) {
    const balance = await fetchSOLBalance(address)
    const prevAddress = walletState.address
    Object.assign(walletState, {
      connected: true,
      address,
      publicKey: new PublicKey(address),
      balance,
      nfts: [], nftsLoading: false,
    })
    if (prevAddress && prevAddress !== address) {
      window.dispatchEvent(new CustomEvent('walletChanged'))
    } else if (!prevAddress) {
      window.dispatchEvent(new CustomEvent('walletConnected'))
    }
  } else if (!isConnected && walletState.connected) {
    Object.assign(walletState, {
      connected: false, address: null, publicKey: null, balance: null,
      nfts: [], nftsLoading: false,
    })
    window.dispatchEvent(new CustomEvent('walletDisconnected'))
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function fetchSOLBalance(address) {
  try {
    const lamports = await getConnection().getBalance(new PublicKey(address))
    return (lamports / 1e9).toFixed(3)
  } catch (e) { return '—' }
}

export function shortenAddr(addr) {
  return addr.slice(0, 4) + '…' + addr.slice(-4)
}
