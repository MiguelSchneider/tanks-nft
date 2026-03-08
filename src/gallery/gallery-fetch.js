// ── GALLERY NFT FETCHER ──────────────────────────────────────────────────────
// Finds ALL NFTs in the collection using getProgramAccounts on the Token
// Metadata program with a memcmp filter on the collection key at offset 368
// (valid for NFTs with 1 creator, which is the default for createNft).
// Works with standard Solana RPC and handles unverified collections.

import { Connection, PublicKey } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi'

const RPC = 'https://api.devnet.solana.com'
const COLLECTION = '8JReTZqNFzFA2hXNGWxkGdcQUWdYkLWkYQLbfsJsS2zn'
const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Metadata V1 layout offset for collection key (with 1 creator):
// key(1) + update_authority(32) + mint(32) + name(4+32) + symbol(4+10) +
// uri(4+200) + seller_fee(2) + creators_option(1) + creators_len(4) +
// creator[0](34) + primary_sale(1) + is_mutable(1) + edition_nonce(1+1) +
// token_standard(1+1) + collection_option(1) + collection_verified(1) = 368
const COLLECTION_KEY_OFFSET = 368

const RARITY_ORDER = { Legendary: 0, Epic: 1, Rare: 2, Uncommon: 3, Common: 4 }

function rarityFromGene(gene) {
  if (!gene) return 'Common'
  const s = (gene.maxHp / 180 + gene.moveSpeed / 3.2 + gene.bulletDmg / 52 + gene.bulletSpd / 10) / 4
  if (s > 0.80) return 'Legendary'
  if (s > 0.65) return 'Epic'
  if (s > 0.50) return 'Rare'
  if (s > 0.35) return 'Uncommon'
  return 'Common'
}

export { COLLECTION, RARITY_ORDER, rarityFromGene }

/**
 * Fetch all NFTs in the collection via getProgramAccounts + per-mint metadata.
 * @param {(msg: string) => void} [onProgress] - Progress callback
 */
export async function fetchCollectionNFTs(onProgress) {
  const conn = new Connection(RPC, 'confirmed')
  const umi = createUmi(RPC).use(mplTokenMetadata())

  onProgress?.('Scanning for collection NFTs...')

  // Find all metadata accounts whose collection key matches ours at offset 368.
  // Only filter by collection key — no key byte filter needed.
  const accounts = await conn.getProgramAccounts(TOKEN_METADATA_PROGRAM, {
    filters: [
      { memcmp: { offset: COLLECTION_KEY_OFFSET, bytes: COLLECTION } },
    ],
    dataSlice: { offset: 33, length: 32 }, // extract just the mint pubkey
  })

  if (accounts.length === 0) return []

  onProgress?.(`Found ${accounts.length} NFTs. Loading metadata...`)

  const mints = accounts.map(a => new PublicKey(a.account.data).toString())

  // For each mint: fetch on-chain metadata, off-chain JSON, and current owner
  // Process in batches to avoid rate limiting
  const BATCH = 3
  const results = []

  for (let i = 0; i < mints.length; i += BATCH) {
    const batch = mints.slice(i, i + BATCH)
    const settled = await Promise.allSettled(batch.map(async (mintStr) => {
      // Fetch on-chain Metaplex metadata
      const metaPda = findMetadataPda(umi, { mint: umiPublicKey(mintStr) })
      const metadata = await fetchMetadata(umi, metaPda)

      // Double-check collection matches
      const coll = metadata.collection
      if (coll.__option !== 'Some' || coll.value.key !== COLLECTION) return null

      // Get current owner via largest token account
      let owner = 'Unknown'
      try {
        const largestAccounts = await conn.getTokenLargestAccounts(new PublicKey(mintStr))
        if (largestAccounts.value.length > 0) {
          const accInfo = await conn.getParsedAccountInfo(largestAccounts.value[0].address)
          owner = accInfo.value?.data?.parsed?.info?.owner || 'Unknown'
        }
      } catch (_) { /* skip */ }

      // Fetch off-chain JSON metadata
      let gene = null, imageUrl = null, attributes = []
      const uri = (metadata.uri || '').replace(/\0/g, '')
      if (uri) {
        try {
          const resp = await fetch(uri)
          if (resp.ok) {
            const meta = await resp.json()
            gene = meta.properties?.gene || null
            imageUrl = meta.image || null
            attributes = meta.attributes || []
          }
        } catch (_) { /* skip */ }
      }

      return {
        mintAddress: mintStr,
        name: (metadata.name || 'Unknown Tank').replace(/\0/g, ''),
        owner,
        imageUrl,
        gene,
        rarity: gene ? rarityFromGene(gene) : (attributes.find(a => a.trait_type === 'Rarity')?.value || 'Common'),
        attributes,
      }
    }))

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value !== null) results.push(r.value)
    }

    onProgress?.(`Loading metadata... ${Math.min(i + BATCH, mints.length)}/${mints.length}`)
  }

  return results
}
