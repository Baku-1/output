# THE OUTLET — WebZone 001
### A Multiplayer Web3 Game Mall on Ronin

The Outlet is a **WebZone** — a 3D digital environment that functions like a website but feels like a place. Players connect their Ronin wallet, their NFT becomes their avatar, and they walk into a mall where the games they actually play have storefronts. The mall is the social layer that exists before the game session starts: meet up, find each other as your NFT avatars, trade peer-to-peer, and launch into games together from the same spot.

**Scope: Ronin-only for beta launch. Additional chains adopted post-beta.**

---

## Stack

| Layer | Tech |
|---|---|
| Renderer | Vanilla JS DDA raycaster (no engine) — floor/ceiling cast, wall DDA + z-buffer, billboard sprite cast |
| Multiplayer | Ably Realtime (position broadcast, DMs, group chat, trade inbox) |
| Wallet | Ronin via `@sky-mavis/tanto-connect` (extension, mobile, Waypoint) |
| Avatars | Axie Spine rigs via `@axieinfinity/mixer` + `pixi-spine`; 6-bone canvas rig for other NFTs; static bake fallback |
| P2P Trading | Seaport 1.6 (`@opensea/seaport-js` v4.1.3) on Ronin mainnet |
| Avatar cache | IndexedDB (static bakes only; Spine instances stay live) |
| NFT resolution | Sky Mavis GraphQL via authenticated API gateway |
| Build | Vite 5 |
| Deploy | Vercel (serverless functions in `api/`) |

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — requires a Ronin wallet (extension, mobile, or Waypoint).

Create a `.env` in the project root:

```
VITE_SKY_MAVIS_API_KEY=   # developer portal — needed for genes → full Spine avatars
VITE_ABLY_API_KEY=        # multiplayer transport
VITE_GROQ_API_KEY=        # AI guide (console.groq.com)
VITE_RONIN_PROJECT_ID=    # WalletConnect / mobile
VITE_WAYPOINT_CLIENT_ID=  # Ronin Waypoint
```

The Vite dev server proxies `/api/graphql` to the Sky Mavis API gateway and attaches your key **server-side** (see `vite.config.js`) — full animated Axie Spine avatars work in dev without deploying. In production the same is handled by the `api/graphql.js` serverless function (`SKY_MAVIS_API_KEY` env var in Vercel).

---

## Project Structure

```
src/
  main.js               — game loop, input, proximity, panel orchestration
  renderer.js           — DDA raycaster, sprite caster (floor-anchored), NPCs, minimap
  store-overlays.js     — logo + key art canvas overlays on storefronts
  map.js                — tile map, store data, STORE_GEOMETRY, zones
  config.js             — all tunable constants
  multiplayer.js        — Ably position broadcast + remoteCache
  wallet.js             — Ronin wallet connect (tanto-connect), getProvider()
  avatarCache.js        — IndexedDB cache + loadPlayerAvatar pipeline
  avatarPicker.js       — NFT avatar picker UI
  spineAvatar.js        — Axie SpineAvatarInstance (mixer + pixi-spine)
  genericSpineAvatar.js — 6-bone canvas rig for non-Axie NFTs
  dmService.js          — Ably DM channels + trade-offer inbox
  dmPanel.js            — DM overlay UI + trade card rendering
  groupChat.js          — proximity group chat
  trade.js              — Seaport order create/fulfill/cancel
  tradeOfferFlow.js     — NFT picker → Seaport sign → DM send
  nftService.js         — NFT image loading, Sky Mavis GraphQL, proxy routing
  npcs.js               — mall NPCs (Rebo the mall cop)
  touch.js              — mobile joystick + gesture controls
api/
  graphql.js            — Vercel fn: authenticated Sky Mavis GraphQL proxy
  img-proxy.js          — Vercel Edge fn: CORS proxy for NFT CDNs (whitelisted)
pipeline/               — gitignored: architect/critic/implementer/auditor/linter docs
public/stores/          — store logo/banner/key art assets
```

---

## Avatar System

`loadPlayerAvatar()` resolves the best available rendering path:

1. **Axie NFT** → genes from Sky Mavis GraphQL → `@axieinfinity/mixer` builds a live animated Spine rig (800×600 ghost canvas, PIXI)
2. **Non-Axie NFT** → `GenericSpineAvatarInstance`: 6-bone canvas rig (Root → Hip → Torso → Head/L-Arm/R-Arm) with idle animation
3. **Fallback** → static BFS-baked texture, or a procedural pattern if everything fails

All three paths are **floor-anchored**: each instance measures its art's true ground-contact row (`_feetY`, alpha-scan of the rendered frame), and the raycaster pins that row to the floor projection line at the sprite's depth — avatars stand on the tiles, never float on walls.

---

## Multiplayer Architecture

```
[Ably Realtime] → position packets → [remoteCache{}] → read at 60fps → sprite cast
```

- Position channel: `pos` / `enter` events — packet `{ id, x, y, dx, dy, avatarUrl, isAxie }`
- Broadcast: 5Hz throttle + idle-skip (no packet when standing still)
- DM channels: `dm:${[addrA, addrB].sort().join(':')}` — deterministic per pair
- Trade inbox: `inbox:${addr}` — offer notifications with toast UI
- Remote players pruned after 2 minutes idle (`PLAYER_TIMEOUT = 120000`)
- Remote sprites are billboards occluded by the wall z-buffer

---

## P2P Trading (Seaport on Ronin)

- Seaport 1.6: `0x0000000000000068f116a894984e2db1123eb395` (Ronin mainnet)
- Axie NFT: `0x32950db2a7164ae833121501c797d79e7b79d74c`
- Flow: Player A signs an order off-chain → serialized into a DM trade card → Player B validates the consideration recipient and fulfills (pays gas)
- Zero conduit key = direct P2P transfer, 24h order expiry

---

## Mall Layout (current)

```
        ARCADE      ACTION       PUZZLE        (y:3-24)
                  AXIE LOBBY
                  AXIE HALL                    (y:25-44 — Axie game-verse, locked)
        RPG       FOOD COURT    STRATEGY       (y:45-57)
                  MAIN HALL                    (y:58-71 — Pixels · Lumiterra)
        LOBBY ← start      EAST SOUTH LOBBY    (y:72-78)
```

Live Ronin storefronts: Pixels, Lumiterra, Wild Forest, Apeiron, Last Odyssey, Kaidro, Machines Arena — plus the Axie wing.

---

## Roadmap

- **Now (beta, Ronin-only):** end-to-end Seaport trade verification, mobile trade testing
- **Post-beta:** additional chains beyond Ronin
- **Guild Halls:** private rooms gated by guild NFT ownership — owner admin panel for wall streams (YouTube/Twitch) and images; hidden entrances in the mall
- **Tutorial Wing:** 5 tutorial storefronts in the East South Lobby (Outlet overview, Trading, DM Chat, Group Chat, Guild Halls)
- **New wings:** Discovery, Community, West/East Passage (Ragnarok, Sunflower Land, PuffGo, Fableborne, Forgotten Runiverse, CyberKongz, and more)
- **Proximity voice chat (V2):** LiveKit huddles for players in the same cluster
- i18n, side/back avatar sprites (awaiting collection art assets)

---

## Deploy (Vercel)

```bash
npm run build   # outputs dist/
```

Connect the repo to Vercel (`vercel.json` sets the Vite framework). Set env vars in the Vercel dashboard: the `VITE_*` keys above plus `SKY_MAVIS_API_KEY` (no prefix — server-side only, used by `api/graphql.js`).

---

## Development Process

Every code change runs the pipeline: **Architect → Critic → Implementer → Auditor → Linter** — each stage a separate pass, no stage audits its own work. Stage docs live in `pipeline/` (gitignored). Session state and product vision live in `claude-state.md`.
