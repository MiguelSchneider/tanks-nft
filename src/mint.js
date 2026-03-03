import { Buffer } from 'buffer'
window.Buffer = Buffer

// Irys/arbundles bundles its own Buffer polyfill whose instances may not pass
// the browser's native ArrayBufferView check inside crypto.subtle.digest.
// Patch once at module load to normalize any such data before hashing.
if (!globalThis.__cryptoDigestPatched) {
  globalThis.__cryptoDigestPatched = true
  const _digest = crypto.subtle.digest.bind(crypto.subtle)
  crypto.subtle.digest = (alg, data) => {
    if (data != null && !(data instanceof ArrayBuffer)) {
      // Normalize to a native Uint8Array regardless of polyfill version
      data = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data)
    }
    return _digest(alg, data)
  }
}

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
  mplTokenMetadata, createNft, findMetadataPda, verifyCollectionV1, TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata'
import {
  percentAmount, generateSigner, publicKey as umiPublicKey,
} from '@metaplex-foundation/umi'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { WebUploader } from '@irys/web-upload'
import { WebSolana } from '@irys/web-upload-solana'
import { walletState, getConnection, getProvider } from './wallet.js'

export const COLLECTION_MINT_ADDRESS = '8JReTZqNFzFA2hXNGWxkGdcQUWdYkLWkYQLbfsJsS2zn'

function buildUmi() {
  const provider = getProvider()
  if (!provider?.publicKey) throw new Error('Wallet not connected')
  const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata())
  umi.use(walletAdapterIdentity(provider))
  return umi
}

// Build a wallet-adapter-compatible provider for Irys from the AppKit provider.
// Irys fund() calls sendTransaction(tx, connection), so we implement it explicitly.
// signMessage may return { signature: Uint8Array } or raw Uint8Array depending on wallet.
function getIrysProvider() {
  const provider = getProvider()
  if (!provider) throw new Error('Wallet not connected')
  return {
    publicKey: provider.publicKey,
    signMessage: async (msg) => {
      const result = await provider.signMessage(msg)
      return result?.signature instanceof Uint8Array ? result.signature : result
    },
    signTransaction: tx => provider.signTransaction(tx),
    signAllTransactions: txs => provider.signAllTransactions
      ? provider.signAllTransactions(txs)
      : Promise.all(txs.map(tx => provider.signTransaction(tx))),
    sendTransaction: async (tx, conn) => {
      if (provider.sendTransaction) {
        return provider.sendTransaction(tx, conn ?? getConnection())
      }
      const signed = await provider.signTransaction(tx)
      return (conn ?? getConnection()).sendRawTransaction(signed.serialize())
    },
  }
}

async function uploadToArweave(data, contentType, onProgress) {
  onProgress?.('Connecting to Arweave…')
  const irys = await WebUploader(WebSolana)
    .withProvider(getIrysProvider())
    .withRpc('https://api.devnet.solana.com')
    .devnet()
  // upload-core checks Buffer.isBuffer(data) using the `._isBuffer` flag (buffer@6 npm package).
  // Native Uint8Array always passes ArrayBuffer.isView, so Buffer.from() inside createData
  // takes the safe fromArrayView path. Setting ._isBuffer = true makes Buffer.isBuffer() pass.
  const bytes = data instanceof Uint8Array
    ? data
    : new Uint8Array(data)
  bytes._isBuffer = true

  // Irys devnet requires the account to be funded before uploading.
  // Check balance and top up automatically from the connected wallet.
  const [price, balance] = await Promise.all([
    irys.getPrice(bytes.length),
    irys.getLoadedBalance(),
  ])
  if (balance.isLessThan(price)) {
    onProgress?.('Funding Irys account — approve in your wallet…')
    await irys.fund(price.multipliedBy(1.2).integerValue())
  }

  const receipt = await irys.upload(bytes, {
    tags: [{ name: 'Content-Type', value: contentType }],
  })
  return `https://gateway.irys.xyz/${receipt.id}`
}

const BODY_SHAPE_NAMES = ['Chamfered', 'Hexagonal', 'Wedge', 'Brick', 'Armored', 'Teardrop']
const TURRET_NAMES = ['Round', 'Square', 'Hex', 'Diamond', 'Soft Square']
const BARREL_NAMES = ['Standard', 'Double', 'Sniper', 'Howitzer', 'Triple']
const TRACK_NAMES = ['Standard', 'Heavy Skirt', 'Narrow']

function calcRarityLabel(gene) {
  const s = (gene.maxHp / 180 + gene.moveSpeed / 3.2 + gene.bulletDmg / 52 + gene.bulletSpd / 10) / 4
  if (s > 0.80) return 'Legendary'
  if (s > 0.65) return 'Epic'
  if (s > 0.50) return 'Rare'
  if (s > 0.35) return 'Uncommon'
  return 'Common'
}

function geneToAttributes(gene) {
  return [
    { trait_type: 'Body Shape', value: BODY_SHAPE_NAMES[gene.bodyShape] },
    { trait_type: 'Turret Shape', value: TURRET_NAMES[gene.turretShape] },
    { trait_type: 'Barrel Type', value: BARREL_NAMES[gene.barrelStyle] },
    { trait_type: 'Track Type', value: TRACK_NAMES[gene.trackStyle] },
    { trait_type: 'Body Color', value: gene.bodyColor },
    { trait_type: 'HP', value: Math.round(gene.maxHp) },
    { trait_type: 'Speed', value: +gene.moveSpeed.toFixed(2) },
    { trait_type: 'Fire Rate', value: +gene.fireRate.toFixed(2) },
    { trait_type: 'Damage', value: Math.round(gene.bulletDmg) },
    { trait_type: 'Bullet Speed', value: +gene.bulletSpd.toFixed(2) },
    { trait_type: 'Rarity', value: calcRarityLabel(gene) },
  ]
}

export async function mintTankNFT(gene, tankName, renderNFTImageFn, onProgress) {
  if (!walletState.connected) throw new Error('Wallet no conectada')

  onProgress('Rendering tank image…')
  const nftCanvas = renderNFTImageFn(gene, tankName)
  const pngBlob = await new Promise(r => nftCanvas.toBlob(r, 'image/png'))
  const pngBuffer = new Uint8Array(await pngBlob.arrayBuffer())

  onProgress('Uploading image to Arweave…')
  const imageUrl = await uploadToArweave(pngBuffer, 'image/png', onProgress)
  console.log('✓ Image:', imageUrl)

  onProgress('Uploading metadata to Arweave…')
  const metadata = {
    name: tankName, symbol: 'TANK',
    description: 'A unique Tank Battle warrior. Gene encoded on-chain.',
    image: imageUrl,
    attributes: geneToAttributes(gene),
    properties: {
      files: [{ uri: imageUrl, type: 'image/png' }],
      category: 'image',
      gene,
    },
  }
  const metaBuffer = new TextEncoder().encode(JSON.stringify(metadata))
  const metadataUrl = await uploadToArweave(metaBuffer, 'application/json', onProgress)
  console.log('✓ Metadata:', metadataUrl)

  onProgress('Creating NFT on-chain — approve signature in your wallet…')
  const umi = buildUmi()
  const mintSigner = generateSigner(umi)
  const hasCollection = COLLECTION_MINT_ADDRESS !== 'PON_AQUI_TU_COLLECTION_ADDRESS'

  const { signature } = await createNft(umi, {
    mint: mintSigner,
    name: tankName,
    symbol: 'TANK',
    uri: metadataUrl,
    sellerFeeBasisPoints: percentAmount(10),
    tokenStandard: TokenStandard.ProgrammableNonFungible,
    ...(hasCollection && {
      collection: { key: umiPublicKey(COLLECTION_MINT_ADDRESS), verified: false },
    }),
  }).sendAndConfirm(umi)

  const mintAddress = mintSigner.publicKey.toString()
  console.log('✓ Mint:', mintAddress)

  if (hasCollection) {
    try {
      await verifyCollectionV1(umi, {
        metadata: findMetadataPda(umi, { mint: mintSigner.publicKey }),
        collectionMint: umiPublicKey(COLLECTION_MINT_ADDRESS),
        collectionAuthority: umi.identity,
      }).sendAndConfirm(umi)
    } catch (e) { console.warn('Verificación omitida:', e.message) }
  }

  return {
    mintAddress, imageUrl, metadataUrl,
    signature: Buffer.from(signature).toString('base64'),
    name: tankName, gene,
    rarity: calcRarityLabel(gene),
    mintedAt: Date.now(),
  }
}