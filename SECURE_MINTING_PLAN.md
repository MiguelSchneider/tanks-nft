# Secure Minting Plan: Server Co-Signing + Server-Side Image Upload

## Problem

All minting logic is client-side. Anyone can inspect the JS bundle, extract the collection address, and mint tanks with fabricated stats/rarity by calling Metaplex directly. The Arweave image upload is also client-controlled, so fake images could be attached to NFTs.

## Solution Overview

Move minting authority to a backend server. The server:
1. Validates the gene data
2. Renders the tank image (server-side)
3. Uploads the image + metadata to Arweave
4. Builds and partially signs the NFT mint transaction (as collection authority)
5. Returns the partially-signed transaction to the client
6. The client signs with their wallet (paying all Solana fees) and submits

The **only cost the server absorbs** is the Arweave upload fee (fractions of a cent per image).

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Client (browser)  │         │   Server (serverless fn)  │
│                     │         │                           │
│ 1. User clicks Mint │         │   Holds:                  │
│ 2. Send gene + name ├────────►│   - Collection authority   │
│    + wallet address │  POST   │     keypair (env var)     │
│                     │ /api/mint│                           │
│                     │         │ 3. Validate gene bounds    │
│                     │         │ 4. Recalculate rarity      │
│                     │         │ 5. Render image (node-canvas)│
│                     │         │ 6. Upload image to Arweave │
│                     │         │ 7. Upload metadata to Arweave│
│                     │         │ 8. Build mint transaction   │
│                     │         │    - user = fee payer       │
│                     │         │    - server = collection auth│
│                     │         │ 9. Partially sign tx        │
│ 11. Phantom prompts │◄────────┤ 10. Return serialized tx    │
│     user to sign    │         │                           │
│ 12. Submit to Solana│         │                           │
└─────────────────────┘         └──────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Set Up the Server Project

Create a small Node.js project (can live in a `server/` folder in this repo or a separate repo).

**Dependencies:**
```bash
npm init -y
npm install express cors dotenv canvas
npm install @metaplex-foundation/umi-bundle-defaults
npm install @metaplex-foundation/mpl-token-metadata
npm install @metaplex-foundation/umi
npm install @metaplex-foundation/umi-eddsa-web3js
npm install @solana/web3.js
npm install @irys/sdk           # server-side Irys SDK (not @irys/web-upload)
```

For serverless (Vercel/Netlify), you'd use their function format instead of Express.

### Step 2: Port Gene Validation to the Server

Copy or import the gene validation logic. The server must enforce:

```js
// Gene stat bounds (must match what createGene() can produce)
const GENE_BOUNDS = {
  bodyShape:   { min: 0, max: 5, integer: true },
  turretShape: { min: 0, max: 4, integer: true },
  barrelStyle: { min: 0, max: 4, integer: true },
  trackStyle:  { min: 0, max: 2, integer: true },
  maxHp:       { min: 60, max: 180 },
  moveSpeed:   { min: 1.2, max: 3.2 },
  fireRate:    { min: 0.1, max: 0.5 },
  bulletDmg:   { min: 12, max: 52 },
  bulletSpd:   { min: 4, max: 10 },
}

function validateGene(gene) {
  for (const [key, bounds] of Object.entries(GENE_BOUNDS)) {
    const val = gene[key]
    if (typeof val !== 'number' || val < bounds.min || val > bounds.max) return false
    if (bounds.integer && !Number.isInteger(val)) return false
  }
  // Recalculate rarity server-side — don't trust client's rarity claim
  return true
}
```

Also validate that color strings are valid HSL values (regex check).

### Step 3: Port Tank Rendering to the Server

Use `node-canvas` (the `canvas` npm package) to run the same drawing code server-side.

- Extract the pure drawing functions from `src/game/renderer.js` and the shape arrays from `src/game/gene.js`
- These are pure canvas operations — they work identically with `node-canvas`
- The server calls `renderTankNFTImage(gene, name)` and gets a PNG buffer
- No browser APIs needed — `node-canvas` provides the same Canvas/Context2D API

**Key consideration:** The shape arrays in `gene.js` use canvas drawing functions. You'll need to make these isomorphic (work in both browser and Node). Options:
- Copy the drawing code into the server project (simpler, but code duplication)
- Extract shared code into a package or shared folder that both client and server import

### Step 4: Server Arweave Upload

Replace the client-side Irys Web SDK with the server-side Irys SDK:

```js
import Irys from '@irys/sdk'

const irys = new Irys({
  network: 'devnet',
  token: 'solana',
  key: process.env.COLLECTION_AUTHORITY_SECRET_KEY, // same keypair
  config: { providerUrl: 'https://api.devnet.solana.com' },
})

async function uploadToArweave(data, contentType) {
  const receipt = await irys.upload(data, {
    tags: [{ name: 'Content-Type', value: contentType }],
  })
  return `https://gateway.irys.xyz/${receipt.id}`
}
```

**Note:** The server's Irys account needs to be funded. You can pre-fund it with a small amount of devnet SOL. This is the cost the server absorbs — but it's very small (< $0.01 per upload).

### Step 5: Build and Partially Sign the Transaction

This is the core of the co-signing pattern:

```js
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata'
import { keypairIdentity, generateSigner, percentAmount, publicKey } from '@metaplex-foundation/umi'

function buildMintTransaction(gene, tankName, metadataUrl, userWalletAddress) {
  const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata())

  // Load collection authority from env
  const secretKey = Uint8Array.from(JSON.parse(process.env.COLLECTION_AUTHORITY_SECRET_KEY))
  const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
  umi.use(keypairIdentity(authorityKeypair))

  const mintSigner = generateSigner(umi)

  // Build the transaction with user as fee payer
  const tx = createNft(umi, {
    mint: mintSigner,
    name: tankName,
    symbol: 'TANK',
    uri: metadataUrl,
    sellerFeeBasisPoints: percentAmount(10),
    tokenStandard: TokenStandard.ProgrammableNonFungible,
    collection: { key: publicKey(COLLECTION_MINT_ADDRESS), verified: false },
    tokenOwner: publicKey(userWalletAddress),  // NFT goes to the user
  })

  // The server signs as collection authority
  // The transaction is returned partially signed — user must sign as fee payer
  // (Exact Umi serialization API may vary — see Metaplex docs for partial signing)

  return { transaction: serializedTx, mintAddress: mintSigner.publicKey }
}
```

**Important:** The exact partial-signing flow depends on the Umi version. You may need to:
1. Build the transaction
2. Set the user's public key as fee payer
3. Sign with the authority keypair only
4. Serialize and return the partially-signed bytes

Research the current Umi docs for `transaction.build()` and partial signing helpers.

### Step 6: Create the API Endpoint

```js
// server/api/mint.js (or Express route)
app.post('/api/mint', async (req, res) => {
  try {
    const { gene, tankName, walletAddress } = req.body

    // 1. Validate
    if (!validateGene(gene)) return res.status(400).json({ error: 'Invalid gene' })
    if (!tankName || tankName.length > 32) return res.status(400).json({ error: 'Invalid name' })
    if (!walletAddress) return res.status(400).json({ error: 'No wallet' })

    // 2. Rate limit (simple in-memory, or use Redis for production)
    // ... check walletAddress hasn't minted in last N minutes ...

    // 3. Render image
    const imageBuffer = renderTankNFTImage(gene, tankName) // returns PNG buffer

    // 4. Upload image to Arweave
    const imageUrl = await uploadToArweave(imageBuffer, 'image/png')

    // 5. Build metadata
    const metadata = {
      name: tankName,
      symbol: 'TANK',
      description: 'A unique Tank Battle warrior. Gene encoded on-chain.',
      image: imageUrl,
      attributes: geneToAttributes(gene),
      properties: { files: [{ uri: imageUrl, type: 'image/png' }], category: 'image', gene },
    }
    const metadataUrl = await uploadToArweave(
      Buffer.from(JSON.stringify(metadata)),
      'application/json'
    )

    // 6. Build and partially sign mint transaction
    const { transaction, mintAddress } = await buildMintTransaction(
      gene, tankName, metadataUrl, walletAddress
    )

    // 7. Also build collection verification transaction (partially signed)
    // ... similar pattern for verifyCollectionV1 ...

    res.json({ transaction, mintAddress, imageUrl, metadataUrl })
  } catch (err) {
    console.error('Mint error:', err)
    res.status(500).json({ error: 'Minting failed' })
  }
})
```

### Step 7: Update the Client (`src/mint.js`)

Replace the current `mintTankNFT` function:

```js
export async function mintTankNFT(gene, tankName, renderNFTImageFn, onProgress) {
  if (!walletState.connected) throw new Error('Wallet not connected')

  onProgress('Preparing mint...')

  // 1. Send gene to server for validation + image upload + tx building
  const resp = await fetch('https://your-server.com/api/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gene,
      tankName,
      walletAddress: walletState.address,
    }),
  })
  if (!resp.ok) throw new Error((await resp.json()).error || 'Server error')

  const { transaction, mintAddress, imageUrl, metadataUrl } = await resp.json()

  // 2. Deserialize the partially-signed transaction
  onProgress('Approve transaction in your wallet...')
  const tx = deserializeTransaction(transaction) // decode from base64/bytes

  // 3. Have the user sign with Phantom (they pay the fee)
  const provider = getProvider()
  const signed = await provider.signTransaction(tx)

  // 4. Submit to Solana
  onProgress('Confirming on-chain...')
  const connection = getConnection()
  const sig = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(sig)

  return {
    mintAddress, imageUrl, metadataUrl,
    signature: sig,
    name: tankName, gene,
    rarity: calcRarityLabel(gene),
    mintedAt: Date.now(),
  }
}
```

**Remove from client:**
- `uploadToArweave()` function
- `buildUmi()` function
- `getIrysProvider()` function
- Irys/Umi imports (except what's needed for deserialization)
- `COLLECTION_MINT_ADDRESS` export (move to server only)

### Step 8: Collection Verification

Currently `verifyCollectionV1` is called with `umi.identity` (the user's wallet). This only works if the user IS the collection authority — which is the security hole.

With the new setup, the server IS the collection authority, so verification happens server-side. You can either:
- Include the verify instruction in the same transaction (preferred — one user approval)
- Have the server submit verification separately after detecting the mint on-chain

---

## Deployment Options

### Option A: Vercel Serverless Function (Recommended for simplicity)
- Create `server/api/mint.js` as a Vercel serverless function
- Set `COLLECTION_AUTHORITY_SECRET_KEY` in Vercel environment variables
- Free tier supports plenty of minting traffic
- **Caveat:** `node-canvas` requires a custom build layer on Vercel (it has native dependencies). Alternative: use Vercel with Docker runtime, or use a different image rendering approach (e.g., Sharp + SVG)

### Option B: Railway / Render / Fly.io
- Full Node.js server with Express
- More control, `node-canvas` works out of the box
- Small monthly cost ($5-7/month) or free tier

### Option C: AWS Lambda
- Similar to Vercel but needs a Lambda layer for `node-canvas`
- More setup, but very cost-effective at scale

---

## Operational Requirements

### Secrets to Manage
- `COLLECTION_AUTHORITY_SECRET_KEY` — the keypair bytes (JSON array) of the collection authority
  - This is the keypair used when you ran `npm run create-collection`
  - **CRITICAL:** If this leaks, anyone can authorize mints. Keep it in env vars only.

### Arweave Funding
- The server's Irys account needs SOL to pay for uploads
- Pre-fund with ~0.1 SOL on devnet (enough for hundreds of uploads)
- For mainnet: monitor balance and top up periodically
- Cost: ~$0.001–0.01 per image upload

### Rate Limiting
- Implement per-wallet rate limiting (e.g., 1 mint per 5 minutes)
- Simple in-memory Map for low traffic; Redis for production

### CORS
- Restrict to your domain only:
  ```js
  app.use(cors({ origin: 'https://your-game-domain.com' }))
  ```

### Monitoring
- Log all mint requests (wallet address, gene hash, success/failure)
- Alert on unusual patterns (rapid minting, out-of-bounds genes)

---

## Migration Checklist

- [ ] Create `server/` directory with Node.js project
- [ ] Port gene validation logic with stat bounds
- [ ] Port `geneToAttributes()` and `calcRarityLabel()`
- [ ] Port tank rendering code to work with `node-canvas`
- [ ] Set up server-side Irys for Arweave uploads
- [ ] Implement `POST /api/mint` endpoint with full flow
- [ ] Implement partial transaction signing (research Umi partial sign API)
- [ ] Include `verifyCollectionV1` in the mint transaction
- [ ] Add rate limiting and CORS
- [ ] Update client `src/mint.js` to call server API
- [ ] Remove client-side Umi/Irys upload code
- [ ] Remove `COLLECTION_MINT_ADDRESS` from client code
- [ ] Deploy server to chosen platform
- [ ] Set `COLLECTION_AUTHORITY_SECRET_KEY` in server env
- [ ] Fund server's Irys account
- [ ] Test full flow end-to-end on devnet
- [ ] Update `vite.config.js` — may be able to remove some polyfills no longer needed client-side

---

## Security Notes

- The gene is the source of truth — the server recalculates everything from it
- Never trust client-provided rarity, image URLs, or metadata
- The collection authority keypair should ONLY exist on the server
- Even with this setup, someone could call your API programmatically — but they can only mint valid tanks with legitimate genes (which is fine)
- For extra protection, add a session token / CSRF token to the API
- Consider signing the gene data with an HMAC on the server when the lobby generates it, then verifying the signature at mint time — this prevents gene tampering entirely
