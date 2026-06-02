# The Outlet — Claude Dev State
WebZone 001 · Game Mall

---

## ⚠ IN PROGRESS — READ THIS FIRST EVERY SESSION

**Rule: Before touching any code, update this section. After each file change, update this section. This is the only record that survives a context wipe.**

### Current task
IDLE — session ended 2026-06-02

### All changes this session (in order)

**1. BFS fix (avatarCache.js)** — TOL 85→40, maxDepth 255→10, conditional white/black peels. Fixes KTTY sprites chopped up.

**2. 6-bone GenericSpineAvatarInstance (src/genericSpineAvatar.js — NEW FILE)**
Root→Hip→Torso→Head/L-Arm/R-Arm. BFS clean inline, image sliced into 5 regions, sine animation.
avatarCache.js non-Axie path routes here → fallback static bake. renderer.js instanceof checks updated.
⚠ NOT TESTED — clear IndexedDB before testing.

**3. NPC renderer hardcoded 64px (renderer.js drawNPCSprites)**
AVATAR_TEX_SIZE=256 broke Rebo — NPC textures are always 64×64. Fixed: `const S = 64`.
Without this: Rebo = black rectangle.

**4. Rebo position (npcs.js)**
Was y:53 (food court). Fixed to y:75 (lobby y:72-78). Comment said lobby but coord was wrong.

**5. Standalone guide panel removed**
index.html: #guide div deleted. main.js: GUIDE_SYS, gHist, gLoad, sendGuide, addGM, gsend/gi listeners all removed.
Rebo NPC dialogue is the ONLY chat.

**6. Ollama switchover (config.js + main.js)**
config.js: ANTHROPIC_MODEL → OLLAMA_URL + OLLAMA_MODEL. main.js: both fetches → `${OLLAMA_URL}/api/chat`.
Default: llama3.2 @ localhost:11434. Override with VITE_OLLAMA_URL / VITE_OLLAMA_MODEL in Vercel.
⚠ NOT TESTED — requires Ollama running with llama3.2 pulled.

**7. Third-person view (renderer.js + main.js)**
main.js: viewMode 'first'|'third'|'overhead', button 👁 1ST → 🎮 3RD → 🗺 TOP.
selfTexture now stored (was empty callback before).
renderer.js: renderThirdPerson() — camera offset 2.5 units back, self-sprite injected.
_drawSprites() + Spine overlay both handle selfSprite param.
⚠ NOT TESTED.

### Known inconsistent state
- Items 2, 6, 7 all untested — test before assuming they work
- IndexedDB must be cleared by user before KTTY rig test
- Third-person needs selfTexture loaded first (happens on enter)

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
