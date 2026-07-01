// ═══════════════════════════════════════════════════════════════
// map.js — The Outlet tile map + store data
// 0 = floor, 1 = wall, 10–48 = storefront facade cells (see CELL)
// ═══════════════════════════════════════════════════════════════

// ── Store data ────────────────────────────────────────────────
export const STORES = {
  // ── Ronin flagship stores ─────────────────────────────────────
  axie:      { name:'Axie Infinity: Origins', wing:'AXIE HALL',    genre:'Battle / Collect',  chain:'Ronin', players:'14,200', cost:'Free',   hex:'#ff6b35', desc:"The flagship of the Axie universe. Build a team of NFT Axies, master a deep card-battle system, and earn SLP and AXS tokens in ranked PvP play.", url:'https://hub.skymavis.com/games/axie-infinity-origins', assets: { poster_left:'/stores/axie/key_art_1.jpg', poster_right:'/stores/axie/key_art_2.jpg', logo:'/stores/axie/logo.jpg', banner:'/stores/axie/banner.jpg' } },
  pixels:    { name:'Pixels',                 wing:'SIMULATION WING',    genre:'RPG / Farming',     chain:'Ronin', players:'18,000', cost:'Free',   hex:'#7ed321', desc:"Farm, build, and explore in this open-world pixel RPG. Own land, grow resources, and trade in a player-driven economy on Ronin.",                  url:'https://play.pixels.xyz' },
  lumiterra: { name:'Lumiterra',              wing:'ADVENTURE WING',    genre:'Action RPG',        chain:'Ronin', players:'6,800',  cost:'Free',   hex:'#f5a623', desc:"Multiplayer action RPG with survival crafting. Explore dungeons, harvest resources, and battle monsters with your NFT characters on Ronin.",         url:'https://marketplace.skymavis.com/games/lumiterra' },
  wildforest: { name:'Wild Forest',           wing:'STRATEGY WING',   genre:'RTS / Strategy',    chain:'Ronin', players:'9,200',  cost:'Free',   hex:'#2ecc71', desc:"Real-time strategy on Ronin. Build bases, command troops, and deploy powerful unit NFTs in fast-paced PvP battles. Earn WOFR tokens.",              url:'https://playwildforest.io' },
  apeiron:   { name:'Apeiron',                wing:'RPG WING',     genre:'RPG / Roguelite',   chain:'Ronin', players:'5,100',  cost:'Free',   hex:'#8e44ad', desc:"Godgame roguelite RPG where you shape planets and command Apostles into battle. NFT planet ownership drives the Apeiron universe on Ronin.",      url:'https://apeiron.fooniemagus.com' },
  lastodyssey:{ name:'Last Odyssey',          wing:'STRATEGY WING',     genre:'Strategy / RPG',    chain:'Ronin', players:'3,400',  cost:'Free',   hex:'#1abc9c', desc:"Tactical strategy RPG set in a post-apocalyptic world. Command heroes, forge alliances, and compete for resources in this Ronin-native title.",    url:'https://lastodyssey.io' },
  kaidro:    { name:'Kaidro: Clan Battles',   wing:'FIGHTING WING',genre:'Action / Battle',   chain:'Ronin', players:'4,600',  cost:'Free',   hex:'#e74c3c', desc:"Cyberpunk mech battle game. Choose your clan, pilot your Kaidro NFT, and fight for dominance in intense real-time arena combat on Ronin.",         url:'https://marketplace.skymavis.com/games/kaidro' },
  machines:  { name:'The Machines Arena',     wing:'SHOOTER WING',genre:'MOBA / Shooter',    chain:'Ronin', players:'7,300',  cost:'Free',   hex:'#3498db', desc:"Top-down tactical MOBA shooter. Command robots, capture objectives, and battle in team-based arenas. Fast-paced Web3 competitive gaming on Ronin.", url:'https://marketplace.skymavis.com/games/the-machines-arena' },

  // ── Axie Hall flagships ───────────────────────────────────────
  atia:      { name:"Atia's Legacy",          wing:'AXIE HALL',    genre:'Action RPG',        chain:'Ronin',       players:'5,600',  cost:'Free',   hex:'#a855f7', desc:"Sky Mavis newest chapter in the Axie universe. A mobile-first action RPG set in the world of Lunacia — recruit Axies, master combat, and uncover the secrets of Atia.", url:'https://axieinfinity.com/', assets: { poster_left: ['/stores/legacy/key_art_1.jpg', '/stores/legacy/key_art_3.jpg'], poster_right: ['/stores/legacy/key_art_2.jpg', '/stores/legacy/key_art_4.jpg'], logo: '/stores/legacy/logo.jpg', banner: '/stores/legacy/banner.jpg' } },

  // ── Axie Game-Verse Wing — Racing & Arcade ───────────────────
  infinitysoccer: { name:'Infinity Soccer', wing:'SPORTS WING', genre:'Sports / Competitive', chain:'Ronin', players:'2,100', cost:'Free', hex:'#00e5ff',
    desc:"1v1 competitive soccer where each match lasts 90 seconds. Axie card attributes map directly to your team body parts, making every Axie a unique player on the pitch.",
    url:'https://hub.skymavis.com/games/infinity-soccer' },

  tinydrift: { name:'Tiny Drift', wing:'RACING WING', genre:'Racing / Casual', chain:'Ronin', players:'3,800', cost:'Free', hex:'#ff8c00',
    desc:"Put your Axies behind the wheel and zip around kart tracks. Earn up to 1,000 AXP per Axie per day in PvE Adventure Mode — the fastest way to level up your squad.",
    url:'https://hub.skymavis.com/games/tiny-drift' },

  lunaciacup: { name:'Lunacia Cup', wing:'RACING WING', genre:'Racing Simulator', chain:'Ronin', players:'1,400', cost:'Free', hex:'#ffd700',
    desc:"One of the first community-built Greenlight titles. A racing simulator set across the landscapes of Lunacia where your Axies compete for glory on the circuit.",
    url:'https://hub.skymavis.com/greenlight' },

  axieball: { name:'Axie Ball', wing:'SPORTS WING', genre:'Sports / Arcade', chain:'Ronin', players:'900', cost:'Free', hex:'#64d860',
    desc:"Physics-based sports arcade title born from the Axie Game Jam. Fast, frantic, and accessible — get your Axies into the arena and score before time runs out.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Puzzle & Idle ─────────────────────
  axiequest: { name:'Axie Quest', wing:'PUZZLE WING', genre:'Match-3 RPG', chain:'Ronin', players:'4,200', cost:'Free', hex:'#c77dff',
    desc:"Match-3 puzzle adventure with an RPG twist. Swap tiles to cast spells and defeat monsters, with micro-progression powered by Rainbow Gem Packages from the Mavis Store.",
    url:'https://hub.skymavis.com/greenlight' },

  puzzlechamps: { name:'Puzzle Champions', wing:'PUZZLE WING', genre:'Tile-Matching Battle', chain:'Ronin', players:'1,600', cost:'Free', hex:'#00cba9',
    desc:"Tile-matching puzzle battle game where Axie traits influence your abilities. Outmatch opponents across an ever-expanding grid of strategic combos.",
    url:'https://hub.skymavis.com/greenlight' },

  culinarywars: { name:'Culinary Wars', wing:'CASUAL/PARTY WING', genre:'Cooking / Time Management', chain:'Ronin', players:'800', cost:'Free', hex:'#ffb347',
    desc:"One of the inaugural Mavis Hub Greenlight titles. Manage your Axie-run kitchen under pressure — cook, plate, and serve before the rush overwhelms your crew.",
    url:'https://hub.skymavis.com/greenlight' },

  triforce: { name:'Tri-Force', wing:'PUZZLE WING', genre:'Strategy Puzzle', chain:'Ronin', players:'700', cost:'Free', hex:'#4fc3f7',
    desc:"Strategy-puzzle title launched alongside Culinary Wars during the Greenlight debut wave. Position your Axies on triangular grids and outmanoeuvre your opponent.",
    url:'https://hub.skymavis.com/greenlight' },

  denofmyst: { name:'Den of Mysteries', wing:'ADVENTURE WING', genre:'Adventure / Exploration', chain:'Ronin', players:'1,100', cost:'Free', hex:'#ab47bc',
    desc:"Story-driven map exploration using environment and tile puzzles. Descend into Lunacia hidden depths, uncover ancient secrets, and guide your Axie through peril.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Action & Strategy ─────────────────
  skysmash: { name:'Axie Sky Smash', wing:'SHOOTER WING', genre:'Artillery / Turn-Based', chain:'Ronin', players:'2,900', cost:'Free', hex:'#ff4444',
    desc:"Turn-based 2D tactical artillery shooter inspired by Gunbound and Worms. Axie body parts map to powerful weapons. Fully destructible maps — no two battles play the same.",
    url:'https://hub.skymavis.com/greenlight' },

  axiewar: { name:'Axie Infinity War', wing:'SHOOTER WING', genre:'Multiplayer Shooter', chain:'Ronin', players:'2,300', cost:'Free', hex:'#ff1744',
    desc:"Real-time multiplayer arena shooter — pit your Axies against each other in intense combat zones. NFT traits become weapon loadouts in this action-packed Greenlight title.",
    url:'https://hub.skymavis.com/games/aiw' },

  trifields: { name:'Tri-Fields / Axie Fields', wing:'STRATEGY WING', genre:'Tactical Grid', chain:'Ronin', players:'1,200', cost:'Free', hex:'#4caf50',
    desc:"Tactical grid-based deployment game. Place your Axies on the battlefield, exploit terrain advantages, and execute strategies that turn body-part traits into decisive weapons.",
    url:'https://hub.skymavis.com/greenlight' },

  acrosslunacia: { name:'Across Lunacia', wing:'PLATFORMER WING', genre:'Platformer / Adventure', chain:'Ronin', players:'1,800', cost:'Free', hex:'#29b6d2',
    desc:"Side-scrolling adventure platformer — explore Lunacia using your own NFT Axies. Run, jump, and battle through hand-crafted levels while Axie traits shape how you play.",
    url:'https://hub.skymavis.com/greenlight' },

  tacticards: { name:'Tacticards', wing:'STRATEGY WING', genre:'Card Game / Deck-Building', chain:'Ronin', players:'1,500', cost:'Free', hex:'#f7c75a',
    desc:"Digital tabletop card game built on custom Axie deck-building mechanics. Draft your hand, deploy your Axies, and outthink opponents in deep strategic card battles.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Discovery Wing — Forged on Ronin (metadata: ronin-storefront-metadata.md) ──
  ragnarokgenesis: { name:'Ragnarok Landverse: Genesis', wing:'RPG WING', genre:'MMORPG', chain:'Ronin', players:'—', cost:'Free', hex:'#358FBD',  // display variant of brand #0C3C54 (too dark for marquee)
    desc:"Return to Rune Midgard in the free-to-play Web3 revival of Ragnarok Online. Quest, grind, and battle MVPs while mining on-chain resources and trading NFT gear and land on Ronin.",
    url:'https://rolg.maxion.gg' },
  ragnarokamerica: { name:'Ragnarok Landverse America', wing:'RPG WING', genre:'MMORPG', chain:'Ronin', players:'120,000+', cost:'Free', hex:'#326ED2',
    desc:"Classic Ragnarok Online rebuilt for North and Latin America. Level up, party for MVP hunts, and earn ION tokens, with items and land minted as tradable NFTs on Ronin.",
    url:'https://rola.maxion.gg' },
  aquariumquest: { name:'Aquarium Quest', wing:'SIMULATION WING', genre:'Cozy Pet Sim', chain:'Ronin', players:'—', cost:'Free', hex:'#0CB4FC',
    desc:"Collect, breed, and raise aquatic pets in a cozy pixel-art aquarium. Decorate tanks, compete in arcade minigames, and earn RON rewards, with Founders Passes tradable on Ronin.",
    url:'https://play.aquarium.quest' },
  thebeacon: { name:'The Beacon', wing:'ACTION WING', genre:'Action Roguelite', chain:'Ronin', players:'—', cost:'Free', hex:'#5A96D2',
    desc:"Fight through procedurally generated dungeons in this fantasy action roguelite RPG. Clear runs solo or co-op, collect cosmetic and housing NFTs, and earn on-chain rewards via Ronin playtests.",
    url:'https://thebeacon.gg' },

  // ── Community Wing — Forged on Ronin ──────────────────────────
  partyicons: { name:'PARTY ICONS', wing:'CASUAL/PARTY WING', genre:'Party Battle Royale', chain:'Ronin', players:'—', cost:'Free', hex:'#FC3CCC',
    desc:"Jump into a multiplayer party royale spanning Party Heist and 25+ Carnival Clash minigames. Compete, climb, and let OGX Hero NFT holders shape events in real time on Ronin.",
    url:'https://www.partyicons.com' },
  calamity: { name:'Calamity', wing:'ACTION WING', genre:'2D Action MMORPG', chain:'Ronin', players:'—', cost:'Free', hex:'#FAD25A',
    desc:"Carve your path through a hardcore 2D MMORPG of dungeons, bosses, and survival trials. Master three classes and 40+ skills, with Dragon Ring NFTs and player trading secured on Ronin.",
    url:'https://app.calamity.online' },
  fableborne: { name:'Fableborne', wing:'STRATEGY WING', genre:'ARPG × Strategy', chain:'Ronin', players:'—', cost:'Free', hex:'#FAE646',
    desc:"Raid enemy kingdoms in quick ARPG battles, then fortify your own. Diablo-meets-Clash strategy with collectible heroes, Kingdoms NFTs, and Essence earnings living on Ronin.",
    url:'https://fableborne.com' },

  // ── West Passage — Forged on Ronin ────────────────────────────
  fishingfrenzy: { name:'Fishing Frenzy', wing:'SIMULATION WING', genre:'Cozy Fishing RPG', chain:'Ronin', players:'25,000', cost:'Free', hex:'#18C8D8',
    desc:"Cast, hook, and reel in a cozy onchain fishing RPG. Cook your catch, upgrade gear, and complete quests in a player-driven economy powered by Ronin and the $FISH token.",
    url:'https://fishingfrenzy.co' },
  craftworld: { name:'Craft World', wing:'SIMULATION WING', genre:'Co-op Crafting Sim', chain:'Ronin', players:'—', cost:'Free', hex:'#FC3C54',
    desc:"Team up with dynomites in a massive co-op crafting sim by VOYA Games. Gather, craft, and build artefacts in a post-apocalyptic world where every action feeds a player-owned onchain economy.",
    url:'https://www.angrydynomiteslab.com/craft-world' },
  chickensaga: { name:'Chicken Saga', wing:'FIGHTING WING', genre:'Breed & Battle', chain:'Ronin', players:'—', cost:'Free', hex:'#FAE66E',
    desc:"Collect, breed, battle, and trade NFT chickens with unique traits. Rub Genesis chickens for Feathers, craft items, and spend $COCK tokens in a player-driven economy on Ronin.",
    url:'https://app.sabongsaga.com' },
  grandarena: { name:'Grand Arena', wing:'SPORTS WING', genre:'AI Fantasy Autobattler', chain:'Ronin', players:'—', cost:'Free', hex:'#246CE4',
    desc:"Draft Moki card NFTs and let AI-powered squads battle in daily fantasy-sports contests. Manage your roster, climb leaderboards, and chase seasonal prize pools on Ronin.",
    url:'https://fantasy.grandarena.gg' },
}

// ── Cell ID constants ─────────────────────────────────────────
export const CELL = {
  FLOOR: 0,
  WALL:  1,
  PLANTER: 2,  // hedge block (garden courtyards) — unused in v5, kept for cell-id stability
  WATER:   3,  // pool / fountain block — unused in v5, kept for cell-id stability
  // Ronin flagship stores
  AX: 10, WF: 11, AP: 12, LO: 13,
  KD: 14, MA: 15, PX: 16, LT: 17,
  // Axie Hall flagship
  TL: 32,  // Atia's Legacy
  // Axie Game-Verse Wing — Racing & Arcade
  IS: 18,  // Infinity Soccer
  TD: 19,  // Tiny Drift
  LC: 20,  // Lunacia Cup
  AB: 21,  // Axie Ball
  // Puzzle & Idle
  AQ: 22,  // Axie Quest
  PC: 23,  // Puzzle Champions
  CW: 24,  // Culinary Wars
  TF: 25,  // Tri-Force
  DM: 26,  // Den of Mysteries
  // Action & Strategy
  SS: 27,  // Sky Smash
  AI: 28,  // Axie Infinity War
  TR: 29,  // Tri-Fields
  AL: 30,  // Across Lunacia
  TA: 31,  // Tacticards
  // Tutorial Wing — cell IDs 33–37
  TU1: 33,  // The Outlet overview
  TU2: 34,  // Trading (Seaport P2P)
  TU3: 35,  // DM Chat
  TU4: 36,  // Group Chat
  TU5: 37,  // Guild Halls & Collabs
  // Forged on Ronin wings — cell IDs 38–48
  RG:  38,  // Ragnarok Landverse: Genesis
  RA:  39,  // Ragnarok Landverse America
  AQ2: 40,  // Aquarium Quest (AQ = Axie Quest)
  BC:  41,  // The Beacon
  PI:  42,  // PARTY ICONS
  CL:  43,  // Calamity
  FB:  44,  // Fableborne
  FF:  45,  // Fishing Frenzy
  CRW: 46,  // Craft World (CW = Culinary Wars)
  CS:  47,  // Chicken Saga
  GA:  48,  // Grand Arena
}

export const CELL_STORE = {
  [10]:'axie',        [11]:'wildforest',
  [12]:'apeiron',     [13]:'lastodyssey',
  [14]:'kaidro',      [15]:'machines',
  [16]:'pixels',      [17]:'lumiterra',
  [32]:'atia',
  // Axie Game-Verse
  [18]:'infinitysoccer', [19]:'tinydrift',
  [20]:'lunaciacup',     [21]:'axieball',
  [22]:'axiequest',      [23]:'puzzlechamps',
  [24]:'culinarywars',   [25]:'triforce',
  [26]:'denofmyst',
  [27]:'skysmash',       [28]:'axiewar',
  [29]:'trifields',      [30]:'acrosslunacia',
  [31]:'tacticards',
  // Tutorial Wing
  [33]:'tutorial_overview',
  [34]:'tutorial_trading',
  [35]:'tutorial_dm',
  [36]:'tutorial_group',
  [37]:'tutorial_guild',
  // Forged on Ronin wings
  [38]:'ragnarokgenesis',  [39]:'ragnarokamerica',
  [40]:'aquariumquest',    [41]:'thebeacon',
  [42]:'partyicons',       [43]:'calamity',
  [44]:'fableborne',       [45]:'fishingfrenzy',
  [46]:'craftworld',       [47]:'chickensaga',
  [48]:'grandarena',
}

// ═══════════════════════════════════════════════════════════════
// MALL LAYOUT v6 — single floor, rebuilt directly from Jeremy's own
// coordinate table (2026-06-29), not re-derived from the photo.
//
// CONFIRMED sketch coordinate system: bottom edge of the sketch = X axis,
// 1–16, increasing LEFT to RIGHT. Left edge of the sketch = Y axis, 1–23,
// increasing BOTTOM to TOP. Origin = bottom-left corner. Each ruler
// square = 4 floor tiles (Jeremy's spec).
//
// MAXY is 23 (the full ruler), even though no room below reaches past
// Y=18. The gap (Y=19-23, tile rows 2-21) is deliberately reserved —
// see claude-state.md "Guild Halls": private NFT-gated rooms, hidden
// doors, proximity-triggered trap doors. Do not shrink this to fit
// content; the empty space is load-bearing for that feature.
// ═══════════════════════════════════════════════════════════════

const GRID = 4    // tiles per sketch square
const MAXY = 23   // full sketch Y ruler — keep full, see note above
const PAD  = 2    // border of untouched wall around the whole layout

// X increases left-to-right same as tile space — no mirroring needed.
const tx = sx => PAD + sx * GRID
// Y increases bottom-to-top, opposite of tile-row direction — flip against MAXY.
const ty = sy => PAD + (MAXY - sy) * GRID

// Inclusive sketch-unit box [x0,x1,y0,y1] → inclusive tile box.
function sketchBox(x0, x1, y0, y1) {
  // x1/y1 are exclusive boundary lines: the room ends at the tile BEFORE tx(x1).
  // This means rooms sharing a boundary coordinate (e.g. A.x1 === B.x0) become
  // touchX/touchY with no overlap, and rooms with a 1-unit sketch gap stay properly
  // separated in tile space instead of being bridged by the old +GRID-1 expansion.
  return { x0: tx(x0), x1: tx(x1) - 1, y0: ty(y1), y1: ty(y0) - 1 }
}

// Room table — ONE source of truth for geometry AND store placement.
// Adjacent rooms are defined with touching or overlapping sketch ranges,
// which (after sketchBox conversion) always produces touching or
// overlapping tile boxes — i.e. carve() naturally fuses them into one
// walkable region with no connector-corridor code needed.
//
// STRATEGY_HALL has two entries (L-shaped room, two sketch rectangles —
// per Jeremy's "A"/"B" split). Same id/label on purpose: shared HUD zone,
// split geometry. Confirmed 2026-06-29: store list stays on the "A"
// segment, "B" carries none — exact per-segment distribution is still a
// storefront-review item.
//
// TUTORIAL_LOBBY is new — Jeremy's table splits the old single TUTORIAL
// room into a small "Tutorial Hall" threshold (no room for facades) and
// a larger "Tutorials Lobby". Confirmed 2026-06-29: the 5 tutorial
// stores live on the lobby box; Tutorial Hall carries none.
//
// MAIN_HALL ("Main Hall/Showcased") is its OWN room — NOT the Axie
// Infinity Franchise room. MAIN_HALL.stores is empty pending Jeremy's
// call on what (if anything) belongs there.
//
// AXIE_FRANCHISE coords from Jeremy (2026-06-29): sketch [13,16,3,7].
// Deliberately overlaps STRATEGY_HALL "A" ([13,14,5,10]) — that overlap
// IS the doorway between the two rooms (Jeremy: entrance at sketch
// x=14, y=6-7). getZone() resolves overlaps by first-match-in-array, so
// AXIE_FRANCHISE is placed AFTER both STRATEGY_HALL entries below —
// confirmed by Jeremy that tiles in the overlap should read as Strategy
// Hall, not Axie Franchise. Don't reorder this above STRATEGY_HALL.
export const ROOMS = [
  { id: 'RACING',              label: 'RACING',                    sketch: [13, 16, 16, 18], stores: ['tinydrift', 'lunaciacup'] },
  { id: 'SPORTS_HALL',         label: 'SPORTS HALL',               sketch: [10, 13, 16, 17], stores: ['infinitysoccer', 'axieball', 'grandarena', 'fishingfrenzy'] },
  { id: 'FOOD_COURT',          label: 'FOOD COURT',                sketch: [7, 10, 13, 17],  stores: ['culinarywars'] },
  { id: 'ACTION_HALL',         label: 'ACTION HALL',               sketch: [4, 7, 16, 17],   stores: ['thebeacon', 'calamity', 'partyicons'] },
  { id: 'PLATFORMER_FIGHTING', label: 'PLATFORMER / FIGHTING',     sketch: [0, 4, 16, 18],   stores: ['acrosslunacia', 'kaidro', 'chickensaga'] },
  { id: 'PUZZLES',             label: 'PUZZLES',                   sketch: [10, 12, 9, 12],  stores: ['axiequest', 'puzzlechamps', 'triforce'] },
  { id: 'STRATEGY_HALL',       label: 'STRATEGY HALL',             sketch: [13, 14, 6, 9],   stores: ['wildforest', 'lastodyssey', 'trifields', 'tacticards', 'fableborne'] },
  { id: 'STRATEGY_HALL',       label: 'STRATEGY HALL',             sketch: [12, 14, 9, 10],  stores: [] },
  { id: 'MAIN_HALL',           label: 'MAIN HALL',                 sketch: [8, 9, 8, 13],    stores: [] },
  { id: 'AXIE_FRANCHISE',      label: 'AXIE INFINITY FRANCHISE',   sketch: [13, 16, 3, 5],   stores: ['axie', 'atia'] },
  { id: 'AXIE_FRANCHISE',      label: 'AXIE INFINITY FRANCHISE',   sketch: [14, 16, 5, 7],   stores: [] },
  { id: 'SIMULATION_HALL',     label: 'SIMULATION HALL',           sketch: [11, 14, 5, 6],   stores: ['pixels', 'aquariumquest', 'craftworld'], wallOrder: ['north', 'south'] },
  { id: 'TUTORIAL',            label: 'TUTORIAL',                  sketch: [9, 10, 4, 5],    stores: [] },
  { id: 'TUTORIAL_LOBBY',      label: 'TUTORIALS LOBBY',           sketch: [7, 12, 2, 4],    stores: ['tutorial_overview', 'tutorial_trading', 'tutorial_dm', 'tutorial_group', 'tutorial_guild'] },
  { id: 'MAIN_LOBBY',          label: 'MAIN LOBBY',                sketch: [8, 11, 5, 8],    stores: [] },
  { id: 'ADVENTURE_HALL',      label: 'ADVENTURE HALL',            sketch: [4, 8, 5, 6],     stores: ['lumiterra', 'denofmyst'] },
  { id: 'ROLE_PLAYING',        label: 'ROLE PLAYING',              sketch: [1, 4, 9, 11],    stores: ['apeiron', 'ragnarokgenesis', 'ragnarokamerica'] },
  { id: 'SHOOTER_HALL',        label: 'SHOOTER HALL',              sketch: [3, 4, 5, 9],     stores: ['machines', 'skysmash', 'axiewar'] },
]

for (const room of ROOMS) {
  const [x0, x1, y0, y1] = room.sketch
  room.box = sketchBox(x0, x1, y0, y1)
}

// Declared connector openings between two named ROOMS (by id). sketch is in
// the same inclusive sketch-coordinate convention as ROOMS.sketch. Whether a
// pair is a 'touch' or 'overlap' is NOT hand-set here — it's computed at
// runtime from the live tile boxes of the named rooms (see the touchX/touchY/
// overlap checks in the wall-restoration pass below), so it can never drift
// out of sync with ROOMS geometry.
export const DOORS = [
  { a: 'RACING',         b: 'SPORTS_HALL',     sketch: [13, 13, 16, 17] },
  { a: 'SPORTS_HALL',    b: 'FOOD_COURT',      sketch: [10, 10, 16, 17] },
  { a: 'FOOD_COURT',     b: 'ACTION_HALL',     sketch: [7,  7,  16, 17] },
  { a: 'FOOD_COURT',     b: 'MAIN_HALL',       sketch: [8,  9,  13, 13] },
  { a: 'ACTION_HALL',    b: 'PLATFORMER_FIGHTING', sketch: [4, 4, 16, 17] },
  { a: 'PUZZLES',        b: 'STRATEGY_HALL',   sketch: [12, 12, 9,  10] },
  { a: 'STRATEGY_HALL',  b: 'SIMULATION_HALL', sketch: [13, 14, 6,  6] },
  { a: 'MAIN_HALL',      b: 'MAIN_LOBBY',      sketch: [8,  9,  8,  8] },
  { a: 'SIMULATION_HALL',b: 'MAIN_LOBBY',      sketch: [11, 11, 5,  6] },
  { a: 'TUTORIAL',       b: 'TUTORIAL_LOBBY',  sketch: [9,  10, 4,  4] },
  { a: 'TUTORIAL',       b: 'MAIN_LOBBY',      sketch: [9,  10, 5,  5] },
  { a: 'MAIN_LOBBY',     b: 'ADVENTURE_HALL',  sketch: [8,  8,  5,  6] },
  { a: 'ADVENTURE_HALL', b: 'SHOOTER_HALL',    sketch: [4,  4,  5,  6] },
  { a: 'ROLE_PLAYING',   b: 'SHOOTER_HALL',    sketch: [3,  4,  9,  9] },
  { a: 'AXIE_FRANCHISE', b: 'STRATEGY_HALL',   sketch: [14, 14, 6,  7] },
  // PUZZLES<->STRATEGY_HALL's A sub-box touch boundary (sketch x=13, the
  // STRATEGY_HALL_A edge column) — connectivity-decisions.md §3: "ring+door
  // needed at the x=12/13 boundary... one decision (keep) covers both
  // Strategy sub-boxes." The B sub-box's door above only opens B's side;
  // without this second entry the A-touch boundary had no door at all and
  // got fully walled, which also severed PUZZLES from the rest of the mall
  // (B's box is fully bisected by that wall column — see wall-restoration
  // pass comments below).
  { a: 'PUZZLES',        b: 'STRATEGY_HALL',   sketch: [13, 13, 9,  10] },
]

// Doors sit ON the boundary between two rooms, not inside either room.
// A touchX door (x0 === x1) is a single tile column; a touchY door
// (y0 === y1) is a single tile row. The y-range/x-range uses the same
// exclusive-end convention as sketchBox.
function doorBox(x0, x1, y0, y1) {
  if (x0 === x1) return { x0: tx(x0), x1: tx(x0),      y0: ty(y1), y1: ty(y0) - 1 }
  if (y0 === y1) return { x0: tx(x0), x1: tx(x1) - 1,  y0: ty(y0), y1: ty(y0)     }
  return           { x0: tx(x0), x1: tx(x1) - 1,  y0: ty(y1), y1: ty(y0) - 1 }
}

for (const door of DOORS) {
  const [x0, x1, y0, y1] = door.sketch
  door.box = doorBox(x0, x1, y0, y1)
}

// Map dimensions — derived from the room table itself (+ PAD border), so
// the grid always exactly fits ROOMS. No hand-kept magic numbers to desync.
const _maxX1 = Math.max(...ROOMS.map(r => r.box.x1))
const _maxY1 = Math.max(...ROOMS.map(r => r.box.y1))
export const MAP_W = _maxX1 + 1 + PAD
export const MAP_H = _maxY1 + 1 + PAD

// No second level in v5 — kept as an empty export because main.js imports
// and loops over ESCALATORS; an empty array makes that loop a no-op.
export const ESCALATORS = []

// No open-air courtyards in v5 — kept as an empty export because
// renderer.js imports SKY_RECTS for its ceiling pass.
export const SKY_RECTS = []

// ── Build the map grid ────────────────────────────────────────
export const MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(CELL.WALL))

function carve(x1, y1, x2, y2) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) MAP[y][x] = CELL.FLOOR
}

function place(x, y, id) {
  if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) MAP[y][x] = id
}

for (const room of ROOMS) carve(room.box.x0, room.box.y0, room.box.x1, room.box.y1)

// ── Wall-restoration pass ──────────────────────────────────────
// carve() only ever paints FLOOR — nothing paints WALL back in once two
// room boxes touch or overlap in tile space. Without this pass, ANY two
// rooms whose sketch boxes happen to touch or overlap become fully open
// to each other, whether or not that connection was intended.
//
// Pair-driven, not a generic per-room ring: for every distinct-id room
// pair we look ONLY at that pair's own shared boundary (touch) or shared
// interior region (overlap) and decide what to wall, directly from DOORS.
// This never writes a wall cell outside the specific A/B relationship
// being resolved — including never touching a THIRD room's box — so the
// ring-bleed class of bug (walling into a neighbor's own open floor)
// can't occur by construction, with no separate exclusion-list bookkeeping
// needed.
function findDoor(idA, idB) {
  return DOORS.find(d => (d.a === idA && d.b === idB) || (d.a === idB && d.b === idA))
}

const span = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) + 1

// Cells no pair's wall-off may ever convert to WALL, computed globally
// before the pairwise pass runs (independently confirmed by instrumented
// testing against the live algorithm below — not theoretical):
//
// 1. Every declared DOORS box. Some rooms triple-overlap in the same tile
//    region (STRATEGY_HALL_A / AXIE_FRANCHISE / SIMULATION_HALL all share
//    one 32-tile zone). Pairs are processed independently, so the
//    STRATEGY_HALL_A<->AXIE_FRANCHISE pair's own non-door wall-off was
//    stomping straight through territory that the AXIE_FRANCHISE<->
//    SIMULATION_HALL and STRATEGY_HALL<->SIMULATION_HALL doors had already
//    (correctly) left open in their own pair processing — measured result
//    before this fix: those 2 doors plus 3 others came out fully or
//    partially walled despite passing their own pair's door check, because
//    a DIFFERENT pair's write landed in the same cells afterward. A door,
//    once declared, must win globally, not just within the one pair that
//    happens to "own" it.
// 2. Every same-id sibling overlap (e.g. STRATEGY_HALL_A ∩ B). The
//    `A.id === B.id` skip below only stops A and B from walling each other
//    directly — it doesn't stop a THIRD room's pairwise wall-off from
//    cutting through their shared territory and bisecting it. Measured:
//    PUZZLES' touch boundary against the A sub-box used to wall the full
//    y-range that B shares with A, which fully severed B's own
//    Puzzles-facing half from the rest of STRATEGY_HALL even though
//    PUZZLES' door into B was never touched — PUZZLES came out completely
//    unreachable from spawn despite its door showing 32/32 floor.
const protectedCell = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(false))
for (const d of DOORS) {
  for (let y = d.box.y0; y <= d.box.y1; y++)
    for (let x = d.box.x0; x <= d.box.x1; x++)
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) protectedCell[y][x] = true
}
for (let i = 0; i < ROOMS.length; i++) {
  for (let j = i + 1; j < ROOMS.length; j++) {
    const A = ROOMS[i], B = ROOMS[j]
    if (A.id !== B.id) continue
    const x0 = Math.max(A.box.x0, B.box.x0), x1 = Math.min(A.box.x1, B.box.x1)
    const y0 = Math.max(A.box.y0, B.box.y0), y1 = Math.min(A.box.y1, B.box.y1)
    if (x1 < x0 || y1 < y0) continue
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) protectedCell[y][x] = true
  }
}

for (let i = 0; i < ROOMS.length; i++) {
  for (let j = i + 1; j < ROOMS.length; j++) {
    const A = ROOMS[i], B = ROOMS[j]
    if (A.id === B.id) continue // same-group siblings (STRATEGY_HALL A/B) — never wall internal seams

    const ox = span(A.box.x0, A.box.x1, B.box.x0, B.box.x1)
    const oy = span(A.box.y0, A.box.y1, B.box.y0, B.box.y1)
    const touchX = ox === 0 && oy > 0   // zero-gap, side-by-side
    const touchY = oy === 0 && ox > 0   // zero-gap, stacked
    const overlap = ox > 0 && oy > 0    // real shared interior cells
    if (!touchX && !touchY && !overlap) continue // corner-only or unrelated — nothing to do

    const door = findDoor(A.id, B.id)

    if (overlap) {
      // Shared interior cells exist (both rooms' carve() calls painted this
      // region FLOOR). Wall every shared cell EXCEPT ones inside the
      // declared door box: no door at all -> wall the whole overlap (e.g.
      // FOOD_COURT<->PUZZLES, post coordinate-fix below). Door covers the
      // full overlap -> nothing gets walled (e.g. RACING<->SPORTS_HALL).
      // Door covers only PART of the overlap -> the remainder gets walled
      // (AXIE_FRANCHISE<->STRATEGY_HALL: door is the narrow entrance notch,
      // the rest of that overlap is walled).
      const x0 = Math.max(A.box.x0, B.box.x0), x1 = Math.min(A.box.x1, B.box.x1)
      const y0 = Math.max(A.box.y0, B.box.y0), y1 = Math.min(A.box.y1, B.box.y1)
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const inDoor = door && x >= door.box.x0 && x <= door.box.x1 && y >= door.box.y0 && y <= door.box.y1
          // No-door pairs wall everything unconditionally — bypass protectedCell so a
          // third room's door box can't accidentally shield cells that should be walled.
          if (!inDoor && (!door || !protectedCell[y][x])) MAP[y][x] = CELL.WALL
        }
      }
    } else if (touchX) {
      // Zero-gap adjacency on x: no buffer cell exists between the boxes,
      // so closing the boundary means converting one room's own edge
      // column to WALL. Always the higher-x ("right") room's edge column —
      // arbitrary but deterministic, and only 1 column thick.
      const left = A.box.x1 < B.box.x0 ? A : B
      const right = left === A ? B : A
      const y0 = Math.max(A.box.y0, B.box.y0), y1 = Math.min(A.box.y1, B.box.y1)
      // A door only applies here if its box actually sits on this specific
      // boundary column (guards against an id collision picking up a door
      // meant for a DIFFERENT sub-box of the same id, e.g. PUZZLES<->
      // STRATEGY_HALL's door belongs to the B sub-box, not this A touch).
      const doorHere = door && door.box.x0 <= right.box.x0 && right.box.x0 <= door.box.x1
      for (let y = y0; y <= y1; y++) {
        const inDoor = doorHere && y >= door.box.y0 && y <= door.box.y1
        if (!inDoor && (!door || !protectedCell[y][right.box.x0])) MAP[y][right.box.x0] = CELL.WALL
      }
    } else {
      // touchY: same idea, zero-gap on y. Always the higher-y ("bottom",
      // larger tile-row) room's edge row.
      const top = A.box.y1 < B.box.y0 ? A : B
      const bottom = top === A ? B : A
      const x0 = Math.max(A.box.x0, B.box.x0), x1 = Math.min(A.box.x1, B.box.x1)
      const doorHere = door && door.box.y0 <= bottom.box.y0 && bottom.box.y0 <= door.box.y1
      for (let x = x0; x <= x1; x++) {
        const inDoor = doorHere && x >= door.box.x0 && x <= door.box.x1
        if (!inDoor && (!door || !protectedCell[bottom.box.y0][x])) MAP[bottom.box.y0][x] = CELL.WALL
      }
    }
  }
}

// ── Storefront facades — auto-placed along each room's free walls ─────
// dir:'v' = cells along y (constant-x wall face); dir:'h' = along x.
const _STORE_CELL = Object.fromEntries(
  Object.entries(CELL_STORE).map(([id, key]) => [key, +id]))

export const STORE_GEOMETRY = {}

function placeRun(key, ax, ay, dir) {
  const id = _STORE_CELL[key]
  for (let i = 0; i < 4; i++)
    place(dir === 'h' ? ax + i : ax, dir === 'h' ? ay : ay + i, id)
  STORE_GEOMETRY[key] = { ax, ay, dir, size: 4 }
}

// Scans the wall ring just outside a room's tile box for cells still
// standing (MAP === WALL — i.e. NOT opened by a touching neighbor room),
// and groups them into maximal straight runs. Facade placement is built
// from this scan, not hand-picked coordinates, so it can never desync
// from ROOMS — move or resize a room and its facades follow automatically.
function hWallRuns(y, x0, x1) {
  const runs = []
  let start = null
  for (let x = x0; x <= x1 + 1; x++) {
    const isWall = x <= x1 && y >= 0 && y < MAP_H && x >= 0 && x < MAP_W && MAP[y][x] === CELL.WALL
    if (isWall) { if (start === null) start = x }
    else if (start !== null) { runs.push({ ax: start, ay: y, dir: 'h', len: x - start }); start = null }
  }
  return runs
}

function vWallRuns(x, y0, y1) {
  const runs = []
  let start = null
  for (let y = y0; y <= y1 + 1; y++) {
    const isWall = y <= y1 && y >= 0 && y < MAP_H && x >= 0 && x < MAP_W && MAP[y][x] === CELL.WALL
    if (isWall) { if (start === null) start = y }
    else if (start !== null) { runs.push({ ax: x, ay: start, dir: 'v', len: y - start }); start = null }
  }
  return runs
}

function roomWallRuns(box, wallOrder) {
  const walls = {
    north: hWallRuns(box.y0 - 1, box.x0, box.x1),
    south: hWallRuns(box.y1 + 1, box.x0, box.x1),
    west:  vWallRuns(box.x0 - 1, box.y0, box.y1),
    east:  vWallRuns(box.x1 + 1, box.y0, box.y1),
  }
  if (wallOrder) {
    // Only scan specified walls in order; within each wall sort longest first.
    // This lets rooms like SIMULATION_HALL restrict placement to south+north only,
    // forcing south to fill first (3 stores) before overflow to north (1 store).
    return wallOrder.flatMap(w => (walls[w] ?? []).sort((a, b) => b.len - a.len))
  }
  return [...walls.north, ...walls.south, ...walls.west, ...walls.east]
    .sort((a, b) => b.len - a.len)
}

// Dry-run the greedy run-packer against a snapshot of run lengths, without
// touching MAP. Used to try a 1-cell gap between facades first (tidier
// spacing) and fall back to a 0-gap packing only if a room is tight —
// e.g. a long run that fits two facades back-to-back but not with a gap
// wedged between them.
function simulateFacades(runsInput, stores, gap) {
  const runs = runsInput.map(r => ({ ...r }))
  let ri = 0, offset = 0
  const placements = []
  for (const key of stores) {
    while (ri < runs.length && runs[ri].len - offset < 4) { ri++; offset = 0 }
    if (ri >= runs.length) break   // out of wall space — return what we have so far
    const run = runs[ri]
    placements.push({
      key,
      ax: run.dir === 'h' ? run.ax + offset : run.ax,
      ay: run.dir === 'h' ? run.ay : run.ay + offset,
      dir: run.dir,
    })
    offset += 4 + gap
  }
  return placements
}

for (const room of ROOMS) {
  if (!room.stores.length) continue
  const runs = roomWallRuns(room.box, room.wallOrder)
  const p1 = simulateFacades(runs, room.stores, 1)
  const p0 = simulateFacades(runs, room.stores, 0)
  // prefer the packing that fits more stores; tiebreak on gap=1 (tidier spacing)
  const placements = p0.length > p1.length ? p0 : p1
  if (placements.length === 0) {
    console.warn(`[map.js] room ${room.id} has no wall space for any store — skipping`)
    continue
  }
  if (placements.length < room.stores.length) {
    console.warn(`[map.js] room ${room.id} placed ${placements.length}/${room.stores.length} stores (room too hemmed-in for all)`)
  }
  for (const p of placements) placeRun(p.key, p.ax, p.ay, p.dir)
}

// ── Tall walls ──────────────────────────────────────────────────
// No crossing/atrium in v5 (single floor, no centerpiece). Kept as an
// empty export because renderer.js checks TALL_CELLS.has(...) per cell.
export const TALL_CELLS = new Set()

// ── Spawn point ───────────────────────────────────────────────
// Center of MAIN LOBBY — the room players land in on entry.
const _lobbyBox = ROOMS.find(r => r.id === 'MAIN_LOBBY').box
export const SPAWN = {
  x: (_lobbyBox.x0 + _lobbyBox.x1) / 2,
  y: (_lobbyBox.y0 + _lobbyBox.y1) / 2,
}

// ── Zone lookup ───────────────────────────────────────────────
const ROOM_HUD_LABELS = {
  RACING:               '🏎  RACING',
  SPORTS_HALL:           '🏆  SPORTS HALL',
  FOOD_COURT:            '🍔  FOOD COURT',
  ACTION_HALL:           '⚔  ACTION HALL',
  PLATFORMER_FIGHTING:   '🥊  PLATFORMER / FIGHTING',
  PUZZLES:               '🧩  PUZZLES',
  STRATEGY_HALL:         '🏗  STRATEGY HALL',
  AXIE_FRANCHISE:        '🎮  AXIE INFINITY FRANCHISE',
  SIMULATION_HALL:       '🌱  SIMULATION HALL',
  TUTORIAL:              '🏛  TUTORIAL',
  TUTORIAL_LOBBY:        '🎓  TUTORIALS LOBBY',
  MAIN_LOBBY:            '✦  MAIN LOBBY  · Spawn',
  ADVENTURE_HALL:        '🧭  ADVENTURE HALL',
  ROLE_PLAYING:          '🐉  ROLE PLAYING',
  SHOOTER_HALL:          '🎯  SHOOTER HALL',
}

// Every floor tile is carved from exactly one or more ROOMS boxes, so a
// fixed-order scan over ROOMS always resolves — the fallback below is a
// safety net, not a load-bearing path.
export function getZone(x, y) {
  for (const room of ROOMS) {
    const b = room.box
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)
      return { id: room.id, label: ROOM_HUD_LABELS[room.id] ?? room.label }
  }
  return { id: 'PROMENADE', label: '✦  THE PROMENADE' }
}

// ── Tutorial Wing stores ──────────────────────────────────────
// Separate from STORES — no game metadata (url, genre, chain, players, cost).
// Each entry: name + hex for the raycaster storefront texture, plus
// 3-5 short steps rendered by the tutorial panel (main.js openTutorialPanel).
export const TUTORIAL_STORES = {
  tutorial_overview: {
    name: 'The Outlet',
    hex:  '#00e5ff',
    steps: [
      { heading: 'Welcome to The Outlet',
        body: 'This is a 3D mall for the Ronin ecosystem. Each storefront is a game you can discover and launch from right here inside the world.' },
      { heading: 'Moving around',
        body: 'Walk with WASD or the on-screen joystick. Use the mouse or drag to look. Arrow keys also work for turning.' },
      { heading: 'Entering a store',
        body: 'Walk up to any storefront until the name appears at the bottom of your screen. Press F or tap Interact to open the store panel, then hit Play to launch.' },
      { heading: 'Meeting other players',
        body: 'Other players appear as their NFT avatars. Walk close to someone and press F to open a direct message. You can also trade NFTs through DMs.' },
      { heading: 'Getting around',
        body: "Check the minimap (bottom-right corner) to see where you are. The zone label in the top-left tells you which wing you're in. Press T to open nearby group chat." },
    ],
  },
  tutorial_trading: {
    name: 'Trading',
    hex:  '#f5a623',
    steps: [
      { heading: 'Find your trade partner',
        body: 'Walk up to the player you want to trade with and press F to open a DM with them.' },
      { heading: 'Send a trade offer',
        body: 'In the DM panel, tap the trade icon (↔) to open the NFT picker. Select the NFT you want to offer and confirm.' },
      { heading: 'They receive a trade card',
        body: 'The other player sees your offer as a trade card in their DM panel. They can review it before accepting.' },
      { heading: 'On-chain settlement',
        body: 'Tap Accept to approve the trade via Seaport on Ronin. Both wallets must sign. The exchange is atomic — either both NFTs move or neither does.' },
      { heading: 'Notes',
        body: 'Trade offers expire after 24 hours. If you receive an offer while exploring, a notification appears at the top of your screen — press Escape to view it.' },
    ],
  },
  tutorial_dm: {
    name: 'DM Chat',
    hex:  '#7ed321',
    steps: [
      { heading: 'Find someone to message',
        body: 'Walk close to another player until their shortened address appears in the toast at the bottom of your screen.' },
      { heading: 'Open a DM',
        body: 'Press F or tap Interact to open a direct message. Type your message and press Enter to send.' },
      { heading: 'While DM is open',
        body: 'Movement and pointer lock are paused while the DM panel is open. Press Escape or click the × to close and return to the world.' },
      { heading: 'Session history',
        body: 'Messages are delivered peer-to-peer via Ably. Chat history lasts for the current session — it clears when you refresh the page.' },
    ],
  },
  tutorial_group: {
    name: 'Group Chat',
    hex:  '#a855f7',
    steps: [
      { heading: 'Open group chat',
        body: 'Press T or tap the chat icon to open the proximity group chat. Everyone nearby can see the conversation.' },
      { heading: 'Proximity-based',
        body: "The group chat reflects your current area of the mall. Move into a new wing and you'll be chatting with whoever is in that space." },
      { heading: 'While chat is open',
        body: 'The world keeps rendering but movement is paused. Press T again or hit Escape to close the panel and resume exploring.' },
      { heading: 'Keep in mind',
        body: 'Group chat is visible to all nearby players. Use DM for private conversations with a specific person.' },
    ],
  },
  tutorial_guild: {
    name: 'Guild Halls',
    hex:  '#ff6b35',
    steps: [
      { heading: 'What is a Guild Hall?',
        body: "Guild Halls are private rooms inside The Outlet, accessible only to holders of a specific guild's NFT on Ronin." },
      { heading: 'Finding the entrance',
        body: 'Look for hidden doors embedded between storefronts. Walk close to one and press F — the entrance is proximity-triggered.' },
      { heading: 'Inside the hall',
        body: 'Each hall has its own private group chat, NFT-holder guest list, and a main wall where the guild owner can display content.' },
      { heading: 'Collabs',
        body: 'Two guilds can share a joint event space or co-host sessions. Watch for collab announcements from your favourite Ronin projects.' },
    ],
  },
}

// ── Minimap zone colours ────────────────────────────────────────────────
export const WING_COLORS = {
  RACING:               '#f5a623',
  SPORTS_HALL:          '#3498db',
  FOOD_COURT:           '#ffb347',
  ACTION_HALL:          '#ff4444',
  PLATFORMER_FIGHTING:  '#ffd700',
  PUZZLES:              '#c77dff',
  STRATEGY_HALL:        '#00d4ff',
  AXIE_FRANCHISE:       '#ff6b35',
  SIMULATION_HALL:      '#64d860',
  TUTORIAL:             '#00e5ff',
  TUTORIAL_LOBBY:       '#00b3d6',
  MAIN_LOBBY:           '#f72585',
  ADVENTURE_HALL:       '#1abc9c',
  ROLE_PLAYING:         '#9b5fff',
  SHOOTER_HALL:         '#ff8c00',
  PROMENADE:            '#888888',
}

// ── Zone-entry splash data ─────────────────────────────────────
// 5s banner on hall entry; 2h per-zone cooldown. Deliberately absent:
// MAIN_LOBBY (one-time welcome + tutorial splashes live there instead).
export const ZONE_SPLASH = {
  RACING:               { title: 'RACING',                   sub: 'Tiny Drift · Lunacia Cup' },
  SPORTS_HALL:          { title: 'SPORTS HALL',              sub: 'Infinity Soccer · Axie Ball · Grand Arena' },
  FOOD_COURT:           { title: 'FOOD COURT',               sub: 'Culinary Wars' },
  ACTION_HALL:          { title: 'ACTION HALL',              sub: 'The Beacon · Calamity · PARTY ICONS' },
  PLATFORMER_FIGHTING:  { title: 'PLATFORMER / FIGHTING',    sub: 'Across Lunacia · Kaidro: Clan Battles · Chicken Saga' },
  PUZZLES:              { title: 'PUZZLES',                  sub: 'Axie Quest · Puzzle Champions · Tri-Force' },
  STRATEGY_HALL:        { title: 'STRATEGY HALL',            sub: 'Wild Forest · Last Odyssey · Fableborne · Tacticards · Tri-Fields' },
  AXIE_FRANCHISE:       { title: 'AXIE INFINITY FRANCHISE',  sub: "Axie Infinity: Origins · Atia's Legacy" },
  SIMULATION_HALL:      { title: 'SIMULATION HALL',          sub: 'Pixels · Aquarium Quest · Fishing Frenzy · Craft World' },
  TUTORIAL:             { title: 'TUTORIAL',                 sub: 'Start here if this is your first visit' },
  TUTORIAL_LOBBY:       { title: 'TUTORIALS LOBBY',          sub: 'The Outlet · Trading · DM Chat · Group Chat · Guild Halls' },
  ADVENTURE_HALL:       { title: 'ADVENTURE HALL',           sub: 'Lumiterra · Den of Mysteries' },
  ROLE_PLAYING:         { title: 'ROLE PLAYING',             sub: 'Apeiron · Ragnarok Landverse: Genesis & America' },
  SHOOTER_HALL:         { title: 'SHOOTER HALL',             sub: 'The Machines Arena · Axie Infinity War · Sky Smash' },
}
