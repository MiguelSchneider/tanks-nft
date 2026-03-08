# Tank Battle: Gene Warfare

A browser-based 2D tank battle game with procedurally generated tanks and Solana NFT minting. Each tank is defined by a unique "gene" that determines its appearance and combat stats. Players can mint their tanks as NFTs on Solana, with images and metadata stored permanently on Arweave.

## Features

- **Procedural Tank Genes** — Every tank is generated from a gene object that controls body shape, turret style, barrel type, track design, colors, and combat stats (HP, speed, fire rate, bullet damage, etc.)
- **Rarity System** — Tanks are automatically classified into rarity tiers based on their stat averages
- **Sandbox Battles** — Fight against configurable AI bots in a destructible arena with repair kits, fuel pickups, and obstacles
- **Solana NFT Minting** — Mint your tank as an NFT via Phantom wallet. The 512×512 tank image and full gene metadata are uploaded to Arweave for permanent storage
- **NFT Collection** — View and select previously minted tank NFTs from the lobby to use in battle
- **Web Audio SFX** — Procedural sound effects for firing, hits, explosions, repairs, and more

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A Solana wallet (e.g. [Phantom](https://phantom.app/)) configured for **devnet**

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens a Vite dev server at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview    # preview the production build locally
```

## Solana / NFT Setup

The game mints NFTs on Solana **devnet** by default.

1. **Create the NFT collection** (one-time setup):

   ```bash
   npm run create-collection
   ```

2. Copy the printed collection mint address into `src/mint.js` as the `COLLECTION_MINT_ADDRESS` constant.

3. Fund your Phantom wallet with devnet SOL via [solfaucet.com](https://solfaucet.com/) or `solana airdrop`.

4. Connect your wallet in the game lobby and mint away.

### Switching to Mainnet

To deploy on mainnet, update the RPC endpoint URLs in `src/wallet.js` and `src/mint.js`, and remove the `.devnet()` call on the Irys client in `src/mint.js`.

## How to Play

1. **Lobby** — Customize your tank gene (random, heavy, speed, or sniper presets), name it, and optionally mint it as an NFT.
2. **Sandbox Battle** — Add/remove AI bots, then launch the battle.
3. **Controls:**

   | Key | Action |
   |-----|--------|
   | ↑ / ↓ | Move forward / backward |
   | ← / → | Rotate tank (turret follows) |
   | A / D | Fine-tune turret angle independently |
   | Space | Fire |
   | Q | Quit to lobby |

4. Collect green **repair kits** to restore HP and orange **fuel kits** to keep moving.
5. After the battle, view the scoreboard and return to the lobby.

## Project Structure

```
├── index.html              # Entry HTML (UI layout + CSS, no inline JS)
├── vite.config.js          # Vite config with Node polyfills for Solana SDKs
├── package.json
├── scripts/
│   └── create-collection.mjs   # One-time NFT collection creation script
└── src/
    ├── main.js             # App entry point — wires wallet globals + game init
    ├── wallet.js           # Phantom wallet integration (connect/disconnect/balance/NFTs)
    ├── mint.js             # NFT minting pipeline (Metaplex Umi + Irys/Arweave)
    └── game/
        ├── init.js         # Game layer entry — exposes window.* for HTML onclick handlers
        ├── state.js        # Shared mutable state (canvas, entity arrays, game state)
        ├── utils.js        # Pure math/color utilities
        ├── audio.js        # Web Audio API sound effects
        ├── gene.js         # Tank gene system (shapes, stats, rarity)
        ├── renderer.js     # Tank rendering (in-game + 512×512 NFT image)
        ├── particles.js    # Particle effects (explosions, sparks, dust)
        ├── entities.js     # Game entity classes (Tank, Bullet, Obstacle, RepairKit)
        ├── world.js        # World generation (obstacles, repair kits, ground tiles)
        ├── lobby.js        # Lobby UI and tank customization
        ├── game.js         # Game loop, collision detection, win conditions
        ├── input.js        # Keyboard input handling
        ├── walletUI.js     # Wallet connection UI in the lobby
        ├── nftStrip.js     # NFT collection display strip
        ├── mintModal.js    # 4-step minting progress modal
        └── toast.js        # Toast notification system
```

## Tech Stack

- **Frontend:** Vanilla JS (ES modules), HTML5 Canvas, Web Audio API
- **Bundler:** [Vite](https://vitejs.dev/)
- **Blockchain:** [Solana](https://solana.com/) (web3.js)
- **NFT Framework:** [Metaplex Umi](https://github.com/metaplex-foundation/umi) + [mpl-token-metadata](https://github.com/metaplex-foundation/mpl-token-metadata)
- **Storage:** [Irys](https://irys.xyz/) (Arweave upload)
- **Wallet:** [Phantom](https://phantom.app/) via Reown AppKit adapter

## License

All rights reserved.
