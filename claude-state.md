# The Outlet — Claude Dev State
WebZone 001 · Game Mall

---

## 🎯 PRODUCT VISION — READ THIS FIRST, EVERY SESSION

The Outlet is a WebZone — a 3D digital environment that functions like a website but feels like a place. Players connect their Ronin wallet, their NFT becomes their avatar, and they walk into a mall where the games they actually play have storefronts.

**The core loop:** Players meet up in the mall, find each other as their NFT avatars, discover or revisit games they want to play, and launch into those games together from the same spot. The mall is the social layer that exists before the game session starts.

**Every decision should serve this:** Mobile controls matter because people will share this on their phone. Store panels matter because that's where the decision to play happens. Rebo matters because new users need a guide. Multiplayer presence matters because seeing your friend's avatar in front of Illuvium is the whole point.

**It's their Outlet** — the place they go before they go play.

---

## ⚠ IN PROGRESS — READ THIS FIRST EVERY SESSION

**Rule: Before touching any code, update this section. After each file change, update this section. This is the only record that survives a context wipe.**

### Current task
IDLE — plan set, next session picks up from NEXT STEPS below

### Session 2026-06-02 — completed and tested

All items from previous list now tested and working in production:
- BFS fix ✅ — KTTY sprites no longer chopped
- GenericSpineAvatarInstance ✅ — portrait detection working, no arm swing on busts
- Third-person view ✅ — world-space projected, camera traces back to wall boundary
- Store overlays ✅ — fixed to use camera coordinates in third-person mode
- Rebo fixed ✅ — correct position (y:75 lobby), no longer a black rectangle
- Standalone guide removed ✅ — Rebo is the only chat
- Performance ✅ — render capped at 640 cols, no persistent rAF violations
- willReadFrequently / getImageData per-frame removed ✅

### Known remaining issues
- Ollama: code is wired but backend doesn't exist yet (see NEXT STEPS #1)
- BFS tolerance raised to 55 / 3 colors — may still leave background on some NFTs, needs ongoing tuning
- IDB version = 8 (all avatars re-bake on next load)

---

## ⚡ NEXT STEPS — work in this order

### 1. Ollama backend (PRIORITY)
Rebo's NPC dialogue calls `${OLLAMA_URL}/api/chat`. OLLAMA_URL defaults to localhost:11434 — doesn't work for Vercel-hosted users. Need a hosted backend.

**What the backend needs:**
- A server running Ollama with llama3.2 (or llama3.1 / mistral — to be decided)
- CORS open to the Vercel deployment domain
- A system prompt that gives the model full knowledge of The Outlet:
  - All store names, descriptions, genres, chains, URLs
  - Mall layout (wings, zones, directions from lobby)
  - How to play / controls
  - What NFTs are supported as avatars
- `VITE_OLLAMA_URL` set in Vercel env to the hosted endpoint

**Options for hosting Ollama:**
- VPS (DigitalOcean, Linode, Hetzner) with Ollama + nginx proxy
- Fly.io / Railway with Ollama Docker container
- Use Groq or Together.ai API (OpenAI-compatible format, same code, no self-hosting)

**Rebo's system prompt** must be updated in `npcs.js` to include full mall knowledge.
Currently it has a partial layout — needs every store, every wing, zone directions, controls, and NFT avatar info.

### 2. Mobile controls
Touch D-pad / joystick for movement. The game is mobile-tested visually but has no touch input.
- Virtual joystick (left thumb zone) for forward/back/strafe
- Virtual look area (right zone) for camera rotation
- F button overlay for store/NPC interaction when nearby
- Esc/close button for panels

### 4. Multiplayer backend migration
**Current:** Supabase Realtime broadcast — hit free tier limit (5M of 2.2M messages). Reduced to 5Hz + movement-skip to buy time.
**Development:** Switch to Ably — 6M messages/month free tier, drop-in replacement for Supabase Realtime broadcast, same pub/sub pattern. Requires swapping the Supabase client in multiplayer.js for the Ably client SDK.
**Production (final):** Self-hosted Socket.io on a VPS (Hetzner ~$5/month). No message limits, full control, scales with the player base. Build this when ready for real traffic.

Migration order: Supabase (now, limping) → Ably (development, stable free tier) → Socket.io (launch/production).

### 5. Fix stores properly
Several stores have placeholder assets or missing `assets` entries in map.js.
Need to audit each store: logo, banner, key_art_1, key_art_2 — what exists vs what's missing.
Also: some store panel descriptions (`s.desc`, `s.players`, `s.cost`) may be placeholders.

---

## Future Implementation — Camera Toggle (First-Person / Overhead)

Add a button to switch between the current first-person raycaster view and a top-down overhead view.

**How:** `drawMinimap()` in `renderer.js` already renders the full map top-down with walls, player position/direction, and remote players. The overhead view is that code scaled to full canvas, centred on the player via canvas translate.

**Toggle logic:**
- In overhead mode: skip `renderFrame()` and `updateStoreOverlays()`, call `drawOverhead()` instead, hide the minimap widget
- In first-person mode: restore current behaviour
- Movement and collision are unchanged in both modes — controls feel identical

**Non-trivial part:** canvas translate to keep the player centred (pan rather than show whole 44×58 map). No raycaster math changes needed.

---

## Storefront Visual Design — Final Architecture

Each storefront has three rendering layers that compose together:

### Layer 1 — Raycaster texture (always visible, all distances)
Built in `makeStoreTex()` in `renderer.js`. A 256×256 canvas-drawn texture baked once at startup. Layout (proportional to `STORE_TEX_SIZE` via `sc = S/128`):

| Zone | Columns | Rows | Content |
|------|---------|------|---------|
| Left neon edge | 0–4px | full | Brand colour strip |
| Left poster panel | 4–40px | 20–114px | Brand gradient + scan lines |
| Door arch | 41–87px | 20–114px | Dark backing, frame, door handle, `[ ENTER ]` |
| Right poster panel | 88–123px | 20–114px | Brand gradient + scan lines |
| Right neon edge | 124–127px | full | Brand colour strip |
| Marquee | full | 0–20px | Store name as text (crisp at any resolution) |
| Base sill | full | 114–124px | Brand colour accent |

**Marquee always uses text, never a logo image** — logo images baked at 256px are unreadably pixelated.

### Layer 2 — Logo overlay (always visible, all stores, no proximity required)
Rendered in `_renderLogo()` in `store-overlays.js`. Called every frame for all stores with a `logo` asset.

- Projects the two world-space edge points of each panel to screen coordinates
- Draws the logo as a **contain** rectangle (full image, letterboxed, centred in the panel)
- Uses `globalCompositeOperation = 'screen'` to eliminate the black JPEG background — only coloured pixels show through onto the orange gradient beneath
- Distance fade: `(14 - avgDepth) / 10`, zero at 14+ units
- No proximity trigger — logo is a permanent storefront sign

### Layer 3 — Key art overlay (proximity only, per-column)
Rendered in `_renderKeyArt()` in `store-overlays.js`. Called only for stores in `nearbyStores` (3-cell radius scan).

- Renders one `ctx.drawImage` call **per screen column** using the same ray-plane intersection math as the raycaster
- Each column: ray hits the store face plane → compute UV fraction → sample image → draw at correct wall height
- **Cover-crop**: image fills full panel height, wide images are cropped to the panel width
- Flip UV when `plY < 0` (dir='v') or `plX < 0` (dir='h') — prevents text/art appearing backwards when approaching from the west or south
- Distance fade same as logo layer

---

## Critical Implementation Details

### Wall face plane — must match the raycaster exactly

The raycaster hits the **boundary** of a wall cell, not its origin. Off by 1 cell = projection from wrong plane = art appears at wrong screen position.

```js
// dir='v' (cells at constant x):
xFace = posX > geo.ax ? geo.ax + 1 : geo.ax   // east face or west face

// dir='h' (cells at constant y):
yFace = posY > geo.ay ? geo.ay + 1 : geo.ay   // south face or north face
```

### UV direction flip

When `plY < 0` (camera plane inverted, e.g. looking west), the left screen column's ray hits the south end of the store and the right column hits the north end — texture appears backwards. Flip `frac`:

```js
if (geo.dir === 'v' && plY < 0) frac = 1 - frac
if (geo.dir === 'h' && plX < 0) frac = 1 - frac
```

Same fix applied to the raycaster `localFrac` in `renderer.js`:
```js
if (geo.dir === 'v' && plY < 0) localFrac = 1 - localFrac
if (geo.dir === 'h' && plX < 0) localFrac = 1 - localFrac
```

### Proximity scan — full grid, not cross pattern

The old cross-pattern scan (`±1` and `±2` on a single axis) missed stores diagonally adjacent. Replaced with a full 3-cell radius grid in `main.js`:

```js
const nearbyStores = new Set()
for (let dy = -3; dy <= 3; dy++) {
  for (let dx = -3; dx <= 3; dx++) {
    const nx = mapX + dx, ny = mapY + dy
    if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) {
      const cell = MAP[ny][nx]
      if (cell >= 10) nearbyStores.add(CELL_STORE[cell])
    }
  }
}
```

`nearbyStores` is a module-level `Set` (not `const` inside `update()`) so it's accessible in `loop()`.

### Why logo uses per-column ray casting (with contain mode)

Originally, logo rendering used a **rectangle projection** (projecting two edge points and drawing a simple 2D rectangle). While this allowed a simple `contain` mode, it resulted in the logo resizing and drifting relative to the wall as the camera moved.

To fix this, the logo renderer (`_renderLogo`) was rewritten to use the **exact same per-column ray-plane intersection math** as the raycaster and key art. 
To achieve the required **contain** (letterboxed) layout while iterating column-by-column:
1. We compute the panel's aspect ratio in world space (`panelWorldW / 1`).
2. We compare it to the logo's aspect ratio to compute a normalized "contain box" (`logoL`, `logoR`, `logoT`, `logoB`).
3. For each screen column, we cast a ray. If the hit fraction falls outside `[logoL, logoR]`, we skip it (horizontal letterboxing).
4. If it's inside, we draw a 1px vertical strip of the logo, scaled to the wall height, but restricted vertically to `[logoT, logoB]` (vertical letterboxing).

This guarantees the logo is perfectly locked to the wall geometry, matches the raycaster's perspective, and never drifts.

---

## Assets Convention

Each store entry in `map.js` can have an `assets` object:

```js
assets: {
  poster_left:  '/stores/{id}/key_art_1.jpg',  // proximity key art, left panel
  poster_right: '/stores/{id}/key_art_2.jpg',  // proximity key art, right panel
  logo:         '/stores/{id}/logo.jpg',        // always-on sign (JPEG, black bg OK — screen blend removes it)
  banner:       '/stores/{id}/banner.jpg',      // detail card preview area (full browser resolution)
}
```

**Logo format note:** JPEG with black background works fine — `screen` blend eliminates it. A PNG with transparency would look cleaner (no blend needed) but isn't required.

**Key art format:** Wide landscape images work best with the cover-crop per-column approach. The centre vertical strip is what shows in the portrait panel, so put important content (characters, action) in the horizontal centre of the image.

---

## Project Structure

```
src/
  main.js            — game loop, input, store/NPC proximity, panel open/close
  renderer.js        — DDA raycaster, sprite caster, NPC rendering, minimap, store textures
  store-overlays.js  — logo (rectangle+screen blend) and key art (per-column) canvas overlays
  map.js             — tile map, store data, STORE_GEOMETRY, zone definitions
  config.js          — all tunable constants (RENDER_SCALE, WALL_HEIGHT, STORE_TEX_SIZE, etc.)
  styles.css         — all UI styling
  multiplayer.js     — Supabase Realtime broadcast
  wallet.js          — Ronin wallet connect
  avatarCache.js     — IndexedDB avatar texture cache
public/
  stores/axie/       — key_art_1.jpg, key_art_2.jpg, logo.jpg, banner.jpg
```

## Map geometry reference — UPDATED 2026-05-31

MAP_W=50, MAP_H=80, CX1=19, CX2=24

```
Layout (y=0 top, y=79 bottom):

  y:1-2   x:19-24  FUTURE EXPANSION STUB
  y:3-17  x:11-32  ACTION WING   (Sky Smash, AIW, Tri-Fields, Across Lunacia, Tacticards)
  y:8-24  x:1-10   ARCADE WING   (Infinity Soccer, Tiny Drift, Lunacia Cup, Axie Ball)
  y:8-24  x:33-44  PUZZLE WING   (Axie Quest, Puzzle Champs, Culinary Wars, Tri-Force, Den of Mysteries)
  y:18-19 x:19-24  ACTION DOORWAY (passage from action wing to lobby)
  y:20-24 x:11-32  AXIE LOBBY
  y:25-44 x:19-24  AXIE HALL     (Origins west wall, Atia's Legacy east wall)
  y:45-57 x:11-32  FOOD COURT    (Gods Unchained south wall)
  y:48-52 x:1-10   RPG WING      (Illuvium north, Big Time south)
  y:48-52 x:33-42  STRATEGY WING (Sandbox north, Star Atlas south)
  y:58-71 x:19-24  MAIN HALL     (Decentraland west, Splinterlands east)
  y:72-78 x:14-29  LOBBY         ← player starts here

Wing loop connections (natural adjacency):
  Arcade ↔ Action:  x=10/11 boundary, y:8-17
  Puzzle ↔ Action:  x=32/33 boundary, y:8-17
  Arcade ↔ Lobby:   x=10/11 boundary, y:20-24
  Puzzle ↔ Lobby:   x=32/33 boundary, y:20-24
  Action ↔ Lobby:   doorway x:19-24, y:18-19
```

```
STORE_GEOMETRY:
  axie:          { ax:18, ay:30, dir:'v', size:4 }  — Origins, west wall of Axie Hall
  atia:          { ax:25, ay:30, dir:'v', size:4 }  — Atia's Legacy, east wall of Axie Hall
  gods:          { ax:11, ay:58, dir:'h', size:4 }  — south wall of Food Court
  illuvium:      { ax: 3, ay:47, dir:'h', size:4 }  — north wall of RPG wing
  bigtime:       { ax: 3, ay:53, dir:'h', size:4 }  — south wall of RPG wing
  sandbox:       { ax:35, ay:47, dir:'h', size:4 }  — north wall of Strategy wing
  staratlas:     { ax:35, ay:53, dir:'h', size:4 }  — south wall of Strategy wing
  decentral:     { ax:18, ay:58, dir:'v', size:4 }  — west wall of Main Hall
  splinter:      { ax:25, ay:58, dir:'v', size:4 }  — east wall of Main Hall
  infinitysoccer:{ ax: 0, ay: 8, dir:'v', size:3 }  — Arcade west wall
  tinydrift:     { ax: 0, ay:12, dir:'v', size:3 }
  lunaciacup:    { ax: 0, ay:16, dir:'v', size:3 }
  axieball:      { ax: 0, ay:20, dir:'v', size:3 }
  axiequest:     { ax:45, ay: 8, dir:'v', size:3 }  — Puzzle east wall
  puzzlechamps:  { ax:45, ay:11, dir:'v', size:3 }
  culinarywars:  { ax:45, ay:14, dir:'v', size:3 }
  triforce:      { ax:45, ay:17, dir:'v', size:3 }
  denofmyst:     { ax:45, ay:20, dir:'v', size:3 }
  skysmash:      { ax:11, ay:18, dir:'h', size:2 }  — Action south wall (left bank)
  axiewar:       { ax:14, ay:18, dir:'h', size:2 }
  trifields:     { ax:17, ay:18, dir:'h', size:2 }
  acrosslunacia: { ax:25, ay:18, dir:'h', size:2 }  — Action south wall (right bank)
  tacticards:    { ax:28, ay:18, dir:'h', size:2 }

Panel zones (fraction of store face):
  Left poster:  0.00 – 0.32
  Door:         0.32 – 0.68
  Right poster: 0.68 – 1.00
```

## Avatar System — State as of 2026-06-02

### What works
- Axie NFTs: SpineAvatarInstance via @axieinfinity/mixer + @esotericsoftware/spine-canvas. Looks great on mobile.
- Static NFTs: BFS background removal → 256px bake → Uint8Array texture. 256px bump deployed this session.
- AVATAR_TEX_SIZE = 256 (was 64, then bumped)

### BFS fix deployed (avatarCache.js)
- TOL: 85 → 40 (was eating thin limbs/accessories)
- maxDepth: 255 → 10 (was flooding entire image from border)
- White/black border peels now conditional on detected background color

### 6-bone rig for non-Axie collections (NEW: genericSpineAvatar.js)
Bone hierarchy: Root → Hip → Torso → Head, L-Arm, R-Arm
- Root: world anchor bottom-centre (no visual)
- Hip: drives lower body vertical bob ±1.4px @ 4.2Hz
- Torso: lateral sway ±0.8px @ 2.1Hz, child of Hip
- Head: nod ±0.025rad @ 1.6Hz, child of Torso
- L-Arm: swing ±0.20rad @ 4.2Hz, child of Torso
- R-Arm: opposite phase swing, child of Torso
- BFS cleaning runs internally before slicing
- Image sliced into 5 visual regions: lower(0-42%H), torso(16-84%W, 26-65%H), head(19-81%W, 0-30%H), lArm(0-22%W, 26-65%H), rArm(78-100%W, 26-65%H)
- Same interface as SpineAvatarInstance: ._canvas, .pixelData, .isReady, .update(dt)

### Routing (avatarCache.js loadPlayerAvatar)
1. Axie contract → SpineAvatarInstance (mixer path)
2. Non-Axie → GenericSpineAvatarInstance → fallback to static bake if init() fails
3. No image → makeProceduralAvatar()

### renderer.js changes
- Imports GenericSpineAvatarInstance
- Both instanceof checks updated to include GenericSpineAvatarInstance

### NOT YET TESTED
- KTTY rendering with 6-bone rig (need to clear IndexedDB + reload)
- Side/back view for moving avatars (scoped, not started)

---

## Next: Ronin Blockchain Games Wing
- Research current Ronin ecosystem games
- Separate wing from Axie Infinity wing
- Connect off east side of Strategy Wing or Food Court

---

## wallet.js rewrite — 2026-05-31

### STEP 1 — main.js review
Exports consumed from wallet.js:
- `connectRonin()` — awaited in click handler; returns address; catch surfaces `err.message`
- `shortAddress(address)` — used in HUD text
- `onAccountChange(cb)` — cb receives `{ address, isConnected }`; reloads on disconnect
- `getAddress()` — dynamic import after enter-btn; used as multiplayer player ID

### STEP 2 — tanto-connect API (confirmed from node_modules types)
```
requestRoninWalletConnector()       → Promise<IBaseConnector>
connector.autoConnect()             → Promise<IConnectResult | null>
connector.connect(chainId: number)  → Promise<IConnectResult>  (.account = address)
ConnectorEvent.ACCOUNTS_CHANGED     → callback(accounts: string[])
ConnectorEvent.DISCONNECT           → callback()
ChainIds.RoninMainnet = 2020
ConnectorErrorType.PROVIDER_NOT_FOUND = "ProviderNotFound"
```
Timing: requestRoninWalletConnector() waits ~700ms for EIP-6963. Must be called at
module load, not in the click handler, or browser revokes user-gesture context.

### STEP 3 — Implementation
Rewrote src/wallet.js from scratch:
- Eager requestRoninWalletConnector() at module load
- autoConnect() first (silent reconnect for returning users)
- connect(ChainIds.RoninMainnet) as fallback (new approval popup)
- Events wired once, guarded by !_connector check

### STEP 4 — Audit: all exports and API calls verified against types ✅

### STEP 5 — Lint: node --check src/wallet.js → exit 0 ✅
