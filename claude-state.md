# The Outlet — Claude Dev State
WebZone 001 · Game Mall · Ronin Beta

---

## 🎯 PRODUCT VISION — READ THIS FIRST, EVERY SESSION

The Outlet is a WebZone — a 3D digital environment that functions like a website but feels like a place. Players connect their Ronin wallet, their NFT becomes their avatar, and they walk into a mall where the games they actually play have storefronts.

**The core loop:** Players meet up in the mall, find each other as their NFT avatars, discover or revisit games they want to play, and launch into those games together from the same spot. The mall is the social layer that exists before the game session starts.

**Scope: Ronin-only for beta launch. Multi-chain post-beta.**

---

## ⚠ IN PROGRESS — READ THIS FIRST EVERY SESSION

**Rule: Before touching any code, update this section. After each file change, update this section. This is the only record that survives a context wipe.**

### Current task
IDLE — all launch-blocking features complete except Seaport test transaction.

### Pipeline discipline
Every code change goes through: Architect → Critic → Implementer → Auditor → Linter.
Each stage is a SEPARATE task. No stage audits its own work.
Pipeline docs live in: `pipeline/` (gitignored).

---

## ✅ COMPLETED — Session 2026-06-07

### DM System (Ably P2P messaging)
- `src/dmService.js` — Ably channel transport (`dm:${[addrA,addrB].sort().join(':')}`)
- `src/dmPanel.js` — overlay UI, text chat + trade cards, Accept/Decline
- Race condition fixed: register callback before fetchHistory, buffer live msgs during fetch
- Escape key fix: `if (e.key === 'Escape') return` before stopPropagation
- XSS fix: DOM construction with textContent, allow-list token ID validation
- Imports: dynamic `_requireTradeModules()` so load failure doesn't kill DM feature
- Consideration recipient guard: checks `item.recipient !== order.parameters.offerer`
- Pointer lock: `wasOpen` flag before clearing state; only re-acquires if panel was actually open
- Trade button: shows error visibly in DM chat on mobile (was silent console-only)

### Trade Offer Notification (inbox channel)
- `initDM` subscribes to `inbox:${myAddr}` on startup
- When trade offer sent: publishes to BOTH DM channel AND `inbox:${theirAddr}`
- `main.js`: `_showTradeNotif()` shows `#trade-notif` toast (z-800)
- Pointer-lock aware: timer pauses during pointer lock, "Press Esc to view" hint

### Seaport P2P Trade (seaport-js v4.1.3 on Ronin)
- Contract: `0x0000000000000068f116a894984e2db1123eb395` (Seaport 1.6, Ronin mainnet)
- Axie NFT: `0x32950db2a7164ae833121501c797d79e7b79d74c`
- `src/trade.js`: `createTradeOrder`, `fulfillTradeOrder`, `cancelTradeOrder`, `serialiseOrder`/`deserialiseOrder`
- Conduit key: `0x000...000` (32 bytes, zero = open channel, correct for P2P)
- BigInt reviver covers: `salt`, `startTime`, `endTime`, `counter` (NOT startAmount/endAmount/identifierOrCriteria — seaport-js expects strings)
- `getRoninProvider()`: uses `wallet.js` `getProvider()` export; throws if no signing provider
- `wallet.js` exports `getProvider()`: checks `_activeConnector.provider` first (WalletConnect/Waypoint), then `window.ronin.provider` (extension)
- Read-only Seaport singleton separate from signing singleton (`_getReadSeaport()`)

### Image Proxy (CORS fix for all Ronin NFT CDNs)
- `api/img-proxy.js` — Vercel Edge Function
- Streams response (no arrayBuffer), 8s AbortSignal timeout
- `https:` protocol check + hostname whitelist before AND after redirect
- Whitelist: `ww-nft-static.sfo3.cdn.digitaloceanspaces.com`, `axiecdn.axieinfinity.com`, `cdn.skymavis.com`, `storage.googleapis.com`, `ipfs.io`, `cloudflare-ipfs.com`, `gateway.pinata.cloud`, `ipfs.4everland.io`
- `// ADD NEW RONIN COLLECTION CDN DOMAINS HERE` comment for future collections
- `src/nftService.js`: `_proxyUrl()` helper — bypasses in dev, routes canvas-baking loads through proxy
- `vercel.json`: `{ "framework": "vite" }` only

### Avatar Fixes
- **selfTexture mismatch fixed**: On Enter, reads `sessionStorage.getItem('avatar-url:${address}')` directly — bypasses IDB. Previously: `avatar-changed` event fired BEFORE the listener was registered (before Enter), so IDB fallback returned stale Axie bake. Now: URL from picker is in sessionStorage by the time Enter fires.
- `avatarCache._bake()`: returns `null` on CORS taint (was returning transparent Uint8Array which got cached as broken texture)
- `avatarCache.clear()`: properly awaits IDB commit (was fire-and-forget)
- `_bakeBestAxie()`: skips null bakes from CORS-tainted canvases

### Multiplayer
- `PLAYER_TIMEOUT = 120000` (2 minutes idle before removal)
- Idle-skip optimization preserved (don't broadcast when position unchanged — saves Ably messages)
- `vite-plugin-node-polyfills`: added for seaport-js Buffer requirement

### Buffer fix (seaport-js)
- `vite.config.js`: `nodePolyfills({ include: ['buffer'], globals: { Buffer: true } })`

---

## 🔴 STILL NEEDED BEFORE LAUNCH

1. **Test transaction** — end-to-end Seaport trade not yet verified with real wallets
2. **Trade on mobile** — trade button now shows errors visibly; root cause of failure unknown until tested post-Buffer fix

---

## 🟡 KNOWN ISSUES (non-blocking)

- Some NFT images still loading as placeholders (Pinata private gateway URL)
- `wallet.js` dynamic import warning in Vite build (harmless — wallet is also statically imported)
- Chunk size warning: `trade-*.js` 741KB, `index-*.js` 1MB (seaport-js is heavy, expected)

---

## 🅿 POST-LAUNCH PARKING LOT

- Multi-language / i18n (i18next — `i18next-browser-languagedetector` for auto-detect)
- Additional chains beyond Ronin
- **Side/back avatar sprites — DEFERRED**: Requires atlas files from collection creators (front, back, profile views). Mirror flip of front-facing NFTs does not simulate turning. Resume when art assets are available. Research report at `pipeline/01-architect/avatar-directions-research.md`.
- New wings: Discovery, Community, West/East Passage (see plan below)
- **Tutorial Wing** — East South Lobby (x:36-51, y:72-78). 5 tutorial storefronts (same look as game stores): 2 north wall, 2 south wall, 1 east wall. Topics: The Outlet overview, Trading, DM Chat, Group Chat, Guild Halls/Collabs. Splash popup "Tutorials" triggers at connecting hall entrance (x:30, y:75). Each store opens a custom tutorial panel on interaction instead of a game panel.
- **Guild Halls** — private rooms gated by guild NFT ownership. Admin panel inside lets guild owner set a stream URL (YouTube/Twitch iframe overlay positioned to wall screen-space) or images to display on a wall. Proximity check: 7 tiles from Axie Origins (NFT #1122) opens a trap door → staircase to guild hall. Hidden doors in walls between storefronts for others.
- **Proximity Voice Chat (V2)** — Livekit (Jeremy already has an account from The Kitchen project). Equal-volume huddle for players in same 3×3 cluster. Add after text chat ships.
- Store assets: most new Ronin stores have no logo/banner/key art yet

---

## Env vars required in Vercel

```
VITE_ABLY_API_KEY=tM5M0A.htoztA:4YE8i7zWRTzHFNQO3YDrbhXwfq-gNGmQXQfkskh7Tak
VITE_GROQ_API_KEY=(get from console.groq.com)
VITE_SKY_MAVIS_API_KEY=(Sky Mavis developer portal)
VITE_RONIN_PROJECT_ID, VITE_WAYPOINT_CLIENT_ID
```

---

## Project Structure

```
src/
  main.js            — game loop, input, proximity, panel orchestration
  renderer.js        — DDA raycaster, sprite caster, NPC, minimap, store textures
  store-overlays.js  — logo + key art canvas overlays
  map.js             — tile map, store data, STORE_GEOMETRY, zone definitions
  config.js          — all tunable constants
  styles.css         — all UI styling
  multiplayer.js     — Ably position broadcast + remoteCache
  wallet.js          — Ronin wallet connect (tanto-connect), getProvider() export
  avatarCache.js     — IndexedDB avatar texture cache, loadPlayerAvatar
  avatarPicker.js    — NFT avatar picker UI
  dmService.js       — Ably DM channel transport
  dmPanel.js         — DM overlay UI + trade card rendering
  dmService.js       — Ably inbox channel for trade notifications
  trade.js           — Seaport order creation/fulfillment/cancellation
  tradeOfferFlow.js  — NFT picker → Seaport sign → DM send
  nftService.js      — NFT image loading, Sky Mavis GraphQL, proxy routing
  spineAvatar.js     — Axie SpineAvatarInstance (mixer)
  genericSpineAvatar.js — 6-bone canvas rig for non-Axie NFTs
  touch.js           — mobile joystick + gesture controls
api/
  img-proxy.js       — Vercel Edge Function: CORS proxy for NFT CDNs
pipeline/            — gitignored: architect/critic/implementer/auditor/linter docs
public/
  stores/            — store logo/banner/key art assets
```

---

## Avatar System

### Rendering paths (loadPlayerAvatar)
1. **Axie NFT** → SpineAvatarInstance (mixer, live animated canvas)
2. **Non-Axie NFT** → GenericSpineAvatarInstance (6-bone canvas rig)
   - Falls back to static BFS bake if Spine init fails
3. **No image / CORS-tainted bake** → makeProceduralAvatar() (generated pattern)

### Key constants
- `AVATAR_TEX_SIZE = 256` (bumped from 64 for quality)
- IDB version = 8
- IDB key = wallet address
- Static bake: Uint8Array (256×256×4 RGBA), stored in IDB
- Spine instances: returned live, NOT stored in IDB

### selfTexture loading (critical — previously had mismatch bug)
On Enter: `loadPlayerAvatar(address, cb, sessionStorage.getItem('avatar-url:${address}') || null)`
Bypass IDB with the URL from picker — IDB may have stale Axie from previous session.
On avatar-change event: same URL-first call.

### GenericSpineAvatarInstance (6-bone rig)
Bone hierarchy: Root → Hip → Torso → Head, L-Arm, R-Arm
- Animation: arms swing ±0.20rad, head nod ±0.025rad, hip bob ±1.4px, torso sway ±0.8px
- Same interface as SpineAvatarInstance: `._canvas`, `.pixelData`, `.isReady`, `.update(dt)`

---

## Multiplayer Architecture

- Transport: Ably Realtime (VITE_ABLY_API_KEY)
- Channel: `REALTIME_CHANNEL` (from config.js)
- Events: `pos` (position broadcast), `enter` (store entry)
- DM channels: `dm:${[addrA,addrB].sort().join(':')}` — per-pair, deterministic
- Inbox channels: `inbox:${myAddr}` — for trade offer notifications
- Position packet: `{ id, x, y, dx, dy, avatarUrl, isAxie }`
- Broadcast throttle: 5Hz + skip if position unchanged (idle optimization)
- `PLAYER_TIMEOUT = 120000ms` (2 min idle before remoteCache prune)

---

## Seaport Architecture

- Library: `@opensea/seaport-js` v4.1.3 (npm installed)
- Contract: `0x0000000000000068f116a894984e2db1123eb395` (Seaport 1.6, Ronin mainnet, deployed 17 Mar 2025)
- Conduit key: `0x0000000000000000000000000000000000000000000000000000000000000000` (zero = open channel = direct P2P transfer)
- endTime default: `Math.floor(Date.now()/1000) + 86400` (24h)
- Order flow:
  - Player A: `createTradeOrder()` → `executeAllActions()` → signs off-chain → `serialiseOrder()` → sends via DM
  - Player B: receives trade card → validates `consideration[*].recipient === offerer` → `fulfillTradeOrder()` → pays gas
- BigInt reviver fields: `salt`, `startTime`, `endTime`, `counter` ONLY

---

## Store Wing Plan (Ronin ecosystem)

### Current stores (Ronin flagship, VERIFIED in map.js)
- `pixels` — Main Hall west wall `{ ax:18, ay:58, dir:'v', size:4 }`
- `lumiterra` — Main Hall east wall `{ ax:25, ay:58, dir:'v', size:4 }`
- `wildforest` — Food Court south wall `{ ax:11, ay:58, dir:'h', size:4 }`
- `apeiron` — RPG Wing north `{ ax:3, ay:47, dir:'h', size:4 }`
- `lastodyssey` — RPG Wing south `{ ax:3, ay:53, dir:'h', size:4 }`
- `kaidro` — Strategy Wing north `{ ax:35, ay:47, dir:'h', size:4 }`
- `machines` — Strategy Wing south `{ ax:35, ay:53, dir:'h', size:4 }`

### Axie wing (UNTOUCHABLE — y:3-44)
All Axie game-verse stores locked. No modifications.

### Planned new wings (post-beta)
Cell IDs 33+ available. Four new wings planned south of y:44:
- **Discovery Wing** x:1-10, y:54-66 — Ragnarok, Pixel Heroes, Sunflower Land, Kuroro
- **Community Wing** x:43-49, y:48-66 — PuffGo, Party Icons, Calamity, Fableborne
- **West Passage** x:5-13, y:72-78 — Tribesters, Forgotten Runiverse, Fishing Frenzy
- **East Passage** x:30-41, y:72-78 — Angry Dynomites, Grand Arena, Chicken Saga, Cyberkongz

---

## Map Geometry Reference

MAP_W=512, MAP_H=512

```
y:3-17   x:11-32  ACTION WING
y:8-24   x:1-10   ARCADE WING
y:8-24   x:33-44  PUZZLE WING
y:20-24  x:11-32  AXIE LOBBY
y:25-44  x:19-24  AXIE HALL (Origins west, Atia east)
y:44-56  x:43-64  EAST LOBBY
y:45-57  x:11-32  FOOD COURT
y:48-52  x:1-10   RPG WING
y:48-52  x:33-42  STRATEGY WING
y:58-71  x:19-24  MAIN HALL (Pixels west, Lumiterra east)
y:72-78  x:14-29  LOBBY ← player starts here
y:74-76  x:30-35  SOUTH CONNECTING HALL
y:72-78  x:36-51  EAST SOUTH LOBBY
```

---

## Storefront Visual Design

4-panel layout: L1(0-20%) | L2(20-40%) | DOOR(40-60%) | R1(60-80%) | R2(80-100%)
- `poster_left` spans L1+L2 (0-40%), `poster_right` spans R1+R2 (60-100%)
- Logo: always-on sign, `screen` blend removes black JPEG background
- Key art: proximity only (3-cell radius), rotates every 15s
- Wall face plane formula (must match raycaster exactly):
  - `dir='v'`: `xFace = posX > geo.ax ? geo.ax + 1 : geo.ax`
  - `dir='h'`: `yFace = posY > geo.ay ? geo.ay + 1 : geo.ay`
- UV flip: `if (geo.dir==='v' && plY<0) frac = 1-frac`

---

## Sky Mavis GraphQL

Endpoint: `https://marketplace-graphql.skymavis.com/graphql`
Used for NFT fetching (avatar picker, trade picker). Requires `VITE_SKY_MAVIS_API_KEY` in production.

Key contract addresses:
- Axie NFT: `0x32950db2a7164ae833121501c797d79e7b79d74c`
- Seaport 1.6: `0x0000000000000068f116a894984e2db1123eb395`
