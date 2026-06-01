# The Outlet — Claude Dev State
WebZone 001 · Game Mall

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
