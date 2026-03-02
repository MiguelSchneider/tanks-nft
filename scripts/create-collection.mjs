import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata'
import { keypairIdentity, percentAmount, generateSigner } from '@metaplex-foundation/umi'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const keypairPath = join(homedir(), '.config', 'solana', 'id.json')
const secret = JSON.parse(readFileSync(keypairPath, 'utf8'))

const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata())
const keypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secret))
umi.use(keypairIdentity(keypair))

console.log('Wallet:', keypair.publicKey.toString())
console.log('Creando colección en devnet…\n')

const collectionMint = generateSigner(umi)

const { signature } = await createNft(umi, {
  mint: collectionMint,
  name: 'Tank Battle',
  symbol: 'TANK',
  uri: 'https://arweave.net/placeholder-collection',
  sellerFeeBasisPoints: percentAmount(10),
  isCollection: true,
}).sendAndConfirm(umi)

console.log('✅ Colección creada!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Collection Mint Address:', collectionMint.publicKey.toString())
console.log('Tx:', Buffer.from(signature).toString('base64'))
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\n👉 Pega la dirección en src/mint.js:')
console.log(`   export const COLLECTION_MINT_ADDRESS = '${collectionMint.publicKey.toString()}'`)
