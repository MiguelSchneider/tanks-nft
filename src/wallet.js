import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { createAppKit } from '@reown/appkit'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { solanaDevnet } from '@reown/appkit/networks'
import { ConnectorController } from '@reown/appkit-controllers'

// ── Clear stale EVM wallet state before AppKit initializes ───────────────────
// AppKit internally uses WAGMI for EVM connectors. On page load it tries to
// auto-reconnect any previously stored WAGMI session (e.g. MetaMask), which
// triggers an unwanted MetaMask popup. Clearing wagmi.* keys removes that stored
// state so AppKit only reconnects via the Solana adapter.
;(function clearStaleEVMState() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('wagmi'))
    .forEach(k => localStorage.removeItem(k))
})()

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
  // Disable social/email login to keep UI focused on wallet connections
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
})

// ── Filter out EVM wallets from the Solana wallet picker ─────────────────────
// MetaMask and Brave Wallet now implement the Solana Wallet Standard, so
// AppKit's watchStandard() picks them up alongside Phantom/Solflare. We remove
// them from ConnectorController state as soon as they appear.
// A wallet is EVM-primary if any of its announced chains starts with "eip155:".
ConnectorController.subscribeKey('connectors', connectors => {
  const evmWallets = connectors.filter(c => c.chain === 'eip155')
  if (evmWallets.length === 0) return

  // Remove from allConnectors so they can't be re-added by future setConnectors calls
  const evmSet = new Set(evmWallets.map(c => c.id))
  for (let i = ConnectorController.state.allConnectors.length - 1; i >= 0; i--) {
    if (evmSet.has(ConnectorController.state.allConnectors[i].id)) {
      ConnectorController.state.allConnectors.splice(i, 1)
    }
  }
  // Rebuild connectors without EVM wallets
  ConnectorController.state.connectors = connectors.filter(c => !evmSet.has(c.id))
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

  // Clear stale WalletConnect pairings from localStorage to prevent
  // the "This account is already linked" error on the next connect attempt.
  _clearWalletConnectStorage()

  Object.assign(walletState, {
    connected: false, address: null, publicKey: null, balance: null,
    nfts: [], nftsLoading: false,
  })
  window.dispatchEvent(new CustomEvent('walletDisconnected'))
}

function _clearWalletConnectStorage() {
  const wcKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('wc@') ||
    k.startsWith('WCM_') ||
    k.startsWith('@w3m') ||
    k.startsWith('W3M') ||
    k.startsWith('wagmi') ||
    k.startsWith('@appkit')
  )
  wcKeys.forEach(k => localStorage.removeItem(k))
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
