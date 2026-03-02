// ── ON-CHAIN NFT FETCHER ──────────────────────────────────────────────────────
// Uses getParsedTokenAccountsByOwner (standard RPC) + per-mint metadata fetch.
// This is more reliable than getProgramAccounts-based approaches and correctly
// handles pNFTs whose collection may not be verified (common when the collection
// authority keypair differs from the user's wallet).

import { Connection, PublicKey } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi'

const RPC              = 'https://api.devnet.solana.com'
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

// Must match COLLECTION_MINT_ADDRESS in src/mint.js
const COLLECTION_MINT = '8JReTZqNFzFA2hXNGWxkGdcQUWdYkLWkYQLbfsJsS2zn'

function rarityFromGene(gene) {
  if (!gene) return 'Common'
  const s = (gene.maxHp / 180 + gene.moveSpeed / 3.2 + gene.bulletDmg / 52 + gene.bulletSpd / 10) / 4
  if (s > 0.80) return 'Legendary'
  if (s > 0.65) return 'Epic'
  if (s > 0.50) return 'Rare'
  if (s > 0.35) return 'Uncommon'
  return 'Common'
}

export async function fetchWalletNFTs(address) {
  const conn = new Connection(RPC, 'confirmed')
  const umi  = createUmi(RPC).use(mplTokenMetadata())

  // Step 1: get all SPL token accounts for this wallet
  const { value: tokenAccounts } = await conn.getParsedTokenAccountsByOwner(
    new PublicKey(address),
    { programId: TOKEN_PROGRAM_ID }
  )

  // Step 2: keep only NFT-shaped accounts (amount=1, decimals=0)
  const nftMints = tokenAccounts
    .filter(({ account }) => {
      const { tokenAmount } = account.data.parsed.info
      return tokenAmount.uiAmount === 1 && tokenAmount.decimals === 0
    })
    .map(({ account }) => account.data.parsed.info.mint)

  if (nftMints.length === 0) return []

  // Step 3: for each mint, fetch on-chain Metaplex metadata and filter to our collection
  // We don't check `collection.verified` because verifyCollectionV1 in mint.js uses
  // umi.identity (the user's Phantom wallet) as the authority, but the collection was
  // created by a separate keypair — so verification fails silently and verified=false.
  const settled = await Promise.allSettled(nftMints.map(async mintStr => {
    const metaPda  = findMetadataPda(umi, { mint: umiPublicKey(mintStr) })
    const metadata = await fetchMetadata(umi, metaPda)

    const coll = metadata.collection
    if (coll.__option !== 'Some' || coll.value.key !== COLLECTION_MINT) return null

    if (!metadata.uri) throw new Error('no URI')
    const resp = await fetch(metadata.uri)
    if (!resp.ok) throw new Error(`metadata fetch ${resp.status}`)
    const meta = await resp.json()
    const gene = meta.properties?.gene
    if (!gene) throw new Error('no gene in metadata')

    return {
      name:        meta.name || metadata.name,
      gene,
      mintAddress: mintStr,
      imageUrl:    meta.image || null,
      rarity:      rarityFromGene(gene),
      mintedAt:    null,
    }
  }))

  const nfts = settled
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)

  console.log(`[fetchNFTs] wallet ${address.slice(0,8)}… → ${nftMints.length} tokens, ${nfts.length} game NFTs`)
  return nfts
}
