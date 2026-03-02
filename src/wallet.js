import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'

let _conn = null
export function getConnection() {
  if (!_conn) _conn = new Connection(clusterApiUrl('devnet'), 'confirmed')
  return _conn
}

export const walletState = {
  connected: false,
  address: null,
  publicKey: null,
  balance: null,
  nfts: [],
  nftsLoading: false,
}

export function getPhantom() {
  return window?.phantom?.solana || window?.solana
}

export function isPhantomInstalled() {
  return getPhantom()?.isPhantom === true
}

export async function connectWallet() {
  if (!isPhantomInstalled()) {
    window.open('https://phantom.app', '_blank')
    throw new Error('Phantom no instalado')
  }
  const phantom = getPhantom()
  const resp = await phantom.connect()
  const publicKey = resp.publicKey
  const address = publicKey.toString()
  const balance = await fetchSOLBalance(address)
  Object.assign(walletState, {
    connected: true, address, publicKey, balance,
    nfts: [], nftsLoading: false,
  })
  phantom.on('accountChanged', (pk) => {
    if (pk) {
      walletState.address = pk.toString()
      walletState.publicKey = pk
      walletState.nfts = []
      walletState.nftsLoading = false
      window.dispatchEvent(new CustomEvent('walletChanged'))
    } else {
      disconnectWallet()
    }
  })
  window.dispatchEvent(new CustomEvent('walletConnected'))
  return walletState
}

export async function disconnectWallet() {
  try { await getPhantom()?.disconnect() } catch (e) {}
  Object.assign(walletState, { connected: false, address: null, publicKey: null, balance: null, nfts: [], nftsLoading: false })
  window.dispatchEvent(new CustomEvent('walletDisconnected'))
}

export async function autoReconnect() {
  const p = getPhantom()
  if (!p?.isConnected) return
  try {
    const resp = await p.connect({ onlyIfTrusted: true })
    const publicKey = resp.publicKey
    const address = publicKey.toString()
    const balance = await fetchSOLBalance(address)
    Object.assign(walletState, {
      connected: true, address, publicKey, balance,
      nfts: [], nftsLoading: false,
    })
    window.dispatchEvent(new CustomEvent('walletConnected'))
  } catch (e) {}
}

export async function fetchSOLBalance(address) {
  try {
    const lamports = await getConnection().getBalance(new PublicKey(address))
    return (lamports / 1e9).toFixed(3)
  } catch (e) { return '—' }
}

export function shortenAddr(addr) {
  return addr.slice(0, 4) + '…' + addr.slice(-4)
}
