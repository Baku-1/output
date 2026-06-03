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
IDLE — moving to mobile controls next session

### Session 2026-06-02/03 — completed and tested ✅

- BFS fix ✅ — KTTY sprites no longer chopped
- GenericSpineAvatarInstance ✅ — portrait detection, no arm swing on busts
- Third-person view ✅ — world-space projected, camera traces to wall boundary
- Store overlays ✅ — use camera coords in third-person mode
- Rebo ✅ — correct position y:75 lobby, not black rectangle
- Standalone guide removed ✅ — Rebo is only chat
- Groq wired ✅ — Rebo uses llama-3.1-8b-instant via Groq API (VITE_GROQ_API_KEY in Vercel)
- Ably multiplayer ✅ — Supabase Realtime replaced, full key in .env and Vercel
- Broadcast throttle ✅ — 5Hz + movement skip, ~90% reduction in messages
- CORS fallback ✅ — non-CORS CDNs fall back to procedural avatar gracefully
- Performance ✅ — render capped at 640 cols, tainted canvas caught
- IDB version = 8

### Env vars required in Vercel
- VITE_ABLY_API_KEY=tM5M0A.htoztA:4YE8i7zWRTzHFNQO3YDrbhXwfq-gNGmQXQfkskh7Tak
- VITE_GROQ_API_KEY=(get from console.groq.com)
- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (kept but unused)
- VITE_SKY_MAVIS_API_KEY, VITE_MORALIS_API_KEY, VITE_RONIN_PROJECT_ID, VITE_WAYPOINT_CLIENT_ID

---

## ⚡ NEXT STEPS — work in this order

### 1. Mobile controls (CURRENT PRIORITY)
Touch input for phones — the site is visually tested on mobile but has no touch controls.

**Joystick (left thumb zone):**
- Virtual joystick in bottom-left quadrant of screen
- Forward/back = W/S, strafe = A/D
- Rendered as a semi-transparent circle with inner thumb indicator
- Touch start = snap joystick to touch point, touch move = update direction/magnitude, touch end = stop

**Swipe to rotate (right thumb zone):**
- Right half of screen: touch drag horizontally = camera rotation (replaces Q/E and mouse look)
- No dedicated UI element — just the swipe gesture on the right side

**Interaction button (bottom-center or bottom-right):**
- Appears when nearNPC or nearStore is set (same condition as toast)
- Tapping it fires the same action as pressing F on keyboard
- Label changes: "TALK" near Rebo, "ENTER" near a store

**Implementation notes:**
- All touch handlers on the canvas element
- Check `window.matchMedia('(pointer: coarse)')` to detect touch device — show controls only on touch
- Don't show on desktop (keyboard is available)

### 2. Ronin-only store overhaul — PLANNED (do this before mobile controls)

**Goal:** Remove all non-Ronin chain stores. Replace them with Ronin-native games from the Ronin Wallet dApp list. Keep Axie game-verse wing stores exactly as-is.

**Stores to REMOVE from map.js STORES object and CELL map:**
- `gods` (Gods Unchained — Immutable X) → cell GO = 11
- `illuvium` (Immutable X) → cell IL = 12
- `bigtime` (Multi-chain) → cell BT = 13
- `sandbox` (Ethereum) → cell SB = 14
- `staratlas` (Solana) → cell SA = 15
- `decentral` (Ethereum) → cell DC = 16
- `splinter` (Hive) → cell SP = 17

**New Ronin games to ADD (priority spots get Main Hall + Food Court):**
These reuse the same STORE_GEOMETRY coordinates — just swap the store ID → cell mapping.

| Slot | Old store | New store | Priority |
|------|-----------|-----------|----------|
| DC (Main Hall west) | Decentraland | Pixels | HIGH — large active Ronin game |
| SP (Main Hall east) | Splinterlands | Lumiterra | HIGH — Ronin RPG |
| GO (Food Court south) | Gods Unchained | Wild Forest | HIGH — popular Ronin strategy |
| IL (RPG Wing north) | Illuvium | Apeiron | HIGH — Ronin RPG |
| BT (RPG Wing south) | Big Time | Last Odyssey | MED |
| SB (Strategy Wing north) | The Sandbox | Kaidro: Clan Battles | MED |
| SA (Strategy Wing south) | Star Atlas | The Machines Arena | MED |

**Remaining Ronin games for new wing expansion (with DAW metrics):**

| Game | DAW | URL | Priority |
|------|-----|-----|----------|
| Ragnarok Landverse America | 5K-15K | rola.maxion.gg | HIGH |
| Ragnarok Landverse Genesis | 5K-10K | rolg.maxion.gg | HIGH |
| Pixel Heroes Adventure | 3K-8K | dapp.pixelheroes.io | HIGH |
| Sunflower Land | 3K-7K | sunflower-land.com | HIGH |
| Kuroro Wilds | 2K-5K | hub.kuroro.com | MED |
| PuffGo | 1.5K-4K | marketplace.skymavis.com | MED |
| Party Icons | 1.5K-3.5K | partyicons.com | MED |
| Calamity | 1K-3K | app.calamity.online | MED |
| Fableborne | 1K-3K | fableborne.com | MED |
| Forgotten Runiverse | 1K-2.5K | game.runiverse.world | MED |
| Chicken Saga | <2K | app.sabongsaga.com | LOW |
| Angry Dynomites | ~1K | craft-world.gg | LOW |
| Wonder Wars | <1K | wonderwars.game | LOW |
| Grand Arena | <1K | grandarena.gg | LOW |
| Cyberkongz | <1K | marketplace.skymavis.com | LOW |
| Fight League | <1K | marketplace.skymavis.com | LOW |
| Tribesters | <1K | marketplace.skymavis.com | LOW |
| Fishing Frenzy | <1K | fishingfrenzy.co | LOW |
| Cambria | <500 | lobby.cambria.gg | LOW |

**Also update existing store DAW metrics in map.js:**
- Pixels: 1,000,000+ DAW
- Wild Forest: 150,000-200,000 DAW
- Axie Origins: 35,000-60,000 DAW
- Lumiterra: 5,000-12,000 DAW
- Apeiron: 2,000-5,000 DAW
- Kaidro: 2,000-6,000 DAW
- Last Odyssey: 1,500-4,000 DAW
- The Machines Arena: 1,000-3,000 DAW

**New wings needed — AXIE WING IS UNTOUCHABLE (y:3-44)**
All new wings must be y:45 or lower (south). Axie Arcade/Puzzle/Action wings are off-limits.

Proposed 4 new wings (all safe, south of Axie territory):

**DISCOVERY WING** — x:1-10, y:54-66 (below RPG Wing, west side)
- Carve: x:1-10, y:54-66. Doorway connecting south from RPG Wing at y:53.
- Stores on west wall (x=0, dir:v, size:3): 4 stores
- Store on south wall (y=67, dir:h, size:4): 1 store
- Games: Ragnarok Landverse America, Ragnarok Landverse Genesis, Pixel Heroes Adventure, Sunflower Land, Kuroro Wilds
- Zone label: DISCOVERY WING · Ronin RPG & Adventure

**COMMUNITY WING** — x:43-49, y:48-66 (east of Strategy Wing)
- Carve: x:43-49, y:48-66. Doorway at x:42-43, y:48-52 connecting Strategy Wing.
- Stores on east wall (x=49, dir:v, size:3): 4 stores
- Store on north wall (y=47, dir:h, size:4): 1 store
- Games: PuffGo, Party Icons, Calamity, Fableborne, Wonder Wars
- Zone label: COMMUNITY WING · Casual & Social

**WEST PASSAGE** — x:5-13, y:72-78 (west of Lobby)
- Carve: x:5-13, y:72-78. Doorway at x:13-14 connecting Lobby.
- Stores on west wall (x=4, dir:v, size:2): 3 stores + south wall (y=79... edge) 
- Actually: stores on north wall (y=71, dir:h) and west wall
- Games: Tribesters, Forgotten Runiverse, Fishing Frenzy, Cambria
- Zone label: INDIE CORNER · Emerging Games

**EAST PASSAGE** — x:30-41, y:72-78 (east of Lobby)
- Carve: x:30-41, y:72-78. Doorway at x:29-30 connecting Lobby.
- Stores on east wall and south wall
- Games: Angry Dynomites, Grand Arena, Chicken Saga, Cyberkongz, Fight League
- Zone label: INDIE CORNER · Emerging Games

**Cell IDs to use for new stores:** 33-51 (33-32 are taken by Axie wing, 32=Atia)
Wait — 32 = TL (Atia's Legacy). New stores start at cell 33.

**Implementation order:**
- [ ] A. Add 19 new store entries to STORES object in map.js
- [ ] B. Add cell constants (33-51) for new stores
- [ ] C. Add CELL_STORE mappings for 33-51
- [ ] D. Carve 4 new wings in map grid
- [ ] E. Place store cells in map grid
- [ ] F. Add STORE_GEOMETRY entries
- [ ] G. Update getZone() for 4 new zone labels
- [ ] H. Update Rebo system prompt with all new stores + directions
- [ ] I. Deploy and verify

**Implementation steps (update claude-state.md after each):**
- [x] Step 1: STORES object updated — 7 non-Ronin removed, 7 Ronin added (pixels, lumiterra, wildforest, apeiron, lastodyssey, kaidro, machines)
- [x] Step 2: CELL_STORE remapped — cells 11-17 now point to new Ronin store keys
- [x] Step 3: Rebo system prompt updated — all 23 stores with exact directions
- [ ] Step 4: Store assets — all new stores have no assets yet (no logo/banner/key art). Storefronts will render with procedural texture only until assets are added.
- [ ] Step 5: Deploy and verify in-game

### 3. Player chat (group + individual)
Chat between players inside the mall — the social glue.

**Group chat:**
- Press T (or tap a chat icon on mobile) to open group chat panel
- Messages broadcast via Ably channel event `chat` to all players in the mall
- Displays sender's short wallet address + message
- Minimal UI — small panel, semi-transparent, doesn't block the world

**Individual/direct chat:**
- Walk up to another player's avatar and press F (or tap) — same proximity as NPC dialogue
- Opens a direct message panel addressed to that player
- Messages sent via Ably channel event `dm` with target player ID
- Receiving player sees a notification indicator on screen

**Implementation notes:**
- Proximity detection for players already exists in remoteCache
- Need a UI panel in index.html similar to the NPC dialogue panel
- Group chat: Ably channel `chat` event alongside existing `pos` and `enter` events
- DM: Ably channel `dm` event with `{ from, to, message }` payload; only render if `to === myId`

### 3. Multiplayer backend migration
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

MAP_W=512, MAP_H=512, CX1=19, CX2=24

```
Layout (y=0 top, y=511 bottom):

  ── East Lobby (2026-06-02) ──
  y:44-56 x:43-64  EAST LOBBY  (22w court, attaches directly to Strategy Wing east end at x=42/43)

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

Panel zones (fraction of store face) — 4-PANEL LAYOUT:
  L1 (0.00–0.20) | L2 (0.20–0.40) | DOOR (0.40–0.60) | R1 (0.60–0.80) | R2 (0.80–1.00)
  poster_left image spans L1+L2 (0.00–0.40). poster_right spans R1+R2 (0.60–1.00).
  Thin divider between L1/L2 and R1/R2 is baked in makeStoreTex() only — not an overlay split.
  Key art rotates every 15 seconds. Never revert to 3-panel (0.00–0.32 / 0.32–0.68 / 0.68–1.00).

VERIFIED STORE_GEOMETRY (current, matches tile placements and STORES keys) — 2026-06-02:
  Ronin flagship stores:
    pixels:      { ax:18, ay:58, dir:'v', size:4 }  — Main Hall west wall
    lumiterra:   { ax:25, ay:58, dir:'v', size:4 }  — Main Hall east wall
    wildforest:  { ax:11, ay:58, dir:'h', size:4 }  — Food Court south wall
    apeiron:     { ax: 3, ay:47, dir:'h', size:4 }  — RPG Wing north wall
    lastodyssey: { ax: 3, ay:53, dir:'h', size:4 }  — RPG Wing south wall
    kaidro:      { ax:35, ay:47, dir:'h', size:4 }  — Strategy Wing north wall
    machines:    { ax:35, ay:53, dir:'h', size:4 }  — Strategy Wing south wall

  Axie Hall (untouchable):
    axie:        { ax:18, ay:30, dir:'v', size:4 }  — Origins, west wall
    atia:        { ax:25, ay:30, dir:'v', size:4 }  — Atia's Legacy, east wall

  Axie Game-Verse (untouchable):
    infinitysoccer: { ax:0,  ay: 8, dir:'v', size:4 }
    tinydrift:      { ax:0,  ay:12, dir:'v', size:4 }
    lunaciacup:     { ax:1,  ay: 7, dir:'h', size:4 }
    axieball:       { ax:5,  ay: 7, dir:'h', size:4 }
    axiequest:      { ax:45, ay: 8, dir:'v', size:4 }
    puzzlechamps:   { ax:45, ay:12, dir:'v', size:4 }
    culinarywars:   { ax:45, ay:16, dir:'v', size:4 }
    triforce:       { ax:34, ay: 7, dir:'h', size:4 }
    denofmyst:      { ax:38, ay: 7, dir:'h', size:4 }
    skysmash:       { ax:11, ay:18, dir:'h', size:4 }
    axiewar:        { ax:15, ay:18, dir:'h', size:4 }
    trifields:      { ax:25, ay:18, dir:'h', size:4 }
    tacticards:     { ax:10, ay: 3, dir:'v', size:4 }
    acrosslunacia:  { ax:33, ay: 3, dir:'v', size:4 }
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
