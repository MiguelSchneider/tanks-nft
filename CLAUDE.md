# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build locally
npm run create-collection  # Create NFT collection on Solana devnet (run once for setup)
```

No lint or test frameworks are configured.

## Architecture

Browser-based 2D tank battle game with Solana NFT minting. The entry point is `index.html` (HTML + CSS only — no inline script). All logic is in `src/` ES modules loaded via `<script type="module" src="/src/main.js">`.

### Module Layers

**Web3 layer** (`src/` root) — wallet and minting, imported only by `src/main.js`:
- **[src/main.js](src/main.js)** — Bootstraps both layers. Imports `src/game/init.js` and exposes wallet globals (`window.connectWallet`, `window.walletState`, etc.) plus the lazy-loaded `window.mintCurrentTankReal`.
- **[src/wallet.js](src/wallet.js)** — Phantom wallet integration. Exports `walletState` singleton (address, publicKey, balance, nfts[]). NFTs persisted to `localStorage['tankNFTs_' + address]`. Fires `walletConnected`/`walletDisconnected`/`walletChanged` custom events.
- **[src/mint.js](src/mint.js)** — NFT minting via Metaplex (Umi) + Irys (Arweave). Lazy-loaded. Takes `renderNFTImageFn` as a callback to stay decoupled from the game layer. `COLLECTION_MINT_ADDRESS` must be set after running `create-collection`.

**Game layer** (`src/game/`) — all game logic, imported transitively by `src/main.js`:

| Module | Responsibility |
|--------|---------------|
| [init.js](src/game/init.js) | Entry point for the game layer. Wires all callbacks, exposes `window.*` globals for HTML `onclick` handlers, calls `initLobby()` and `setupInput()`. |
| [state.js](src/game/state.js) | Single source of truth for shared mutable state: `canvas`, `ctx`, `W()`/`H()`, `WORLD` constant, entity arrays (`tanks[]`, `bullets[]`, `obstacles[]`, `repairKits[]`, `particles[]`, `groundTiles[]`), `keys{}`, `gameState{}`, and `playerGene`/`bots` getters/setters. |
| [utils.js](src/game/utils.js) | Pure math/color utilities: `rand`, `randi`, `dist`, `angleDiff`, `clamp`, `lerpColor`, `hexToRgb`, `shadeColor`, `randHsl`, `shortenAddr`. |
| [audio.js](src/game/audio.js) | Web Audio API. `AudioContext` singleton via `getAudio()`. Exports `sfxFire`, `sfxHit`, `sfxBump`, `sfxExplode`, `sfxRespawn`, `sfxCrumble`, `sfxRepair`, `sfxMintSuccess`. |
| [gene.js](src/game/gene.js) | Tank gene system. Shape arrays (`BODY_SHAPES`, `TURRET_SHAPES`, `BARREL_STYLES`, `TRACK_STYLES`) are arrays of canvas drawing functions. `createGene()`, `genePreset(type)`, `calcRarity(gene)`. |
| [renderer.js](src/game/renderer.js) | `drawTankAt(ctx, gene, cx, cy, bodyAngle, turretAngle, flashPct, trackOffset)` — stateless, works on any canvas context. `renderTankNFTImage(gene, name)` returns a 512×512 `<canvas>`. |
| [particles.js](src/game/particles.js) | Manages `particles[]` from `state.js`. `spawnExplosion`, `spawnHitSpark`, `spawnRepairEffect`, `spawnObstacleExplosion`, `spawnDust`. `spawnRepairEffect` calls `sfxRepair` internally. |
| [entities.js](src/game/entities.js) | `RepairKit`, `Obstacle`, `Bullet`, `Tank` classes. `Tank.updateBot()` reads `tanks[]`/`bullets[]`/`repairKits[]` from `state.js` directly. |
| [world.js](src/game/world.js) | `generateObstacles/RepairKits/Ground()` — clears and repopulates arrays from `state.js`. `drawGround(camX, camY)`, `updateRepairKits()`. |
| [lobby.js](src/game/lobby.js) | `playerGene` and `bots[]` owned here via `state.js` getters/setters. `initLobby()`, `updateLobbyUI()`, `randomizeGene(type)`, `addBot()`, `removeBot()`. |
| [game.js](src/game/game.js) | `startGame()`, `gameLoop()` (rAF loop), `endGame(winner)`, `returnToLobby()`. All collision detection happens here. |
| [walletUI.js](src/game/walletUI.js) | `toggleWallet()`, `updateWalletUI()`, `setupWalletEvents(onConnected, onDisconnected)` — registers the custom wallet events. Imports `walletState` directly from `src/wallet.js`. |
| [nftStrip.js](src/game/nftStrip.js) | `updateNFTStrip()`, `selectNFT(i, onLobbyUpdate)`. Uses callback to trigger lobby refresh without importing `lobby.js`. |
| [mintModal.js](src/game/mintModal.js) | 4-step minting UI. `mintCurrentTank(onNFTStripUpdate)` calls `window.mintCurrentTankReal`. |
| [input.js](src/game/input.js) | `setupInput(onQuit)` — registers `keydown`/`keyup`. Uses callback for Q-key to avoid importing `game.js`. |
| [toast.js](src/game/toast.js) | `showToast(msg, duration, color)` — manages `#mintToast` element. |

### Dependency Order (no cycles)

```
utils → audio → toast → gene → state → renderer → particles → entities → world
→ walletUI/nftStrip/mintModal/lobby/input → game → init → main.js
```

### State Management Pattern

Entity arrays in `state.js` are **never reassigned** — modules import the array reference once and it stays valid. To reset on a new game, use `arr.length = 0` then push new items. The `walletState` object from `src/wallet.js` is imported directly by game modules — there is no local copy.

### HTML `onclick` Handlers

`index.html` uses bare function names in `onclick` attributes (e.g. `onclick="startGame()"`). These are wired in `src/game/init.js` as `window.startGame = startGame`, etc. When adding a new button, expose the handler in `init.js`.

### Tank Gene System

A `gene` object encodes all procedural traits: body/turret/barrel/track shape indices, color strings (HSL), and stat floats (HP, speed, fireRate, bulletDmg, etc.). Shape arrays in `gene.js` hold canvas drawing functions indexed by the gene's shape fields. `calcRarity(gene)` derives a tier from stat averages. The gene is passed through to NFT metadata `properties.gene`.

### Solana / NFT Setup

- Network: hardcoded to **devnet** in `wallet.js` and `mint.js`
- To switch to mainnet: update RPC URLs and Irys `.devnet()` call in `mint.js`
- `COLLECTION_MINT_ADDRESS` in `mint.js` must be set after running `npm run create-collection` once
- Irys has a `._isBuffer = true` workaround and a `crypto.subtle.digest` patch in `mint.js` for buffer@6 compatibility — do not remove these

### Vite Configuration

`vite.config.js` uses `vite-plugin-node-polyfills` to inject `Buffer`, `global`, and `process` into the browser bundle — required by `@solana/web3.js` and `@irys/web-upload`.
