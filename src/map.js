// ═══════════════════════════════════════════════════════════════
// map.js — The Outlet tile map + store data
// 0 = floor, 1 = wall, 10–17 = original stores, 18–32 = Axie wing
// ═══════════════════════════════════════════════════════════════

// ── Store data ────────────────────────────────────────────────
export const STORES = {
  // ── Original stores ───────────────────────────────────────────
  axie:      { name:'Axie Infinity: Origins', wing:'AXIE HALL',    genre:'Battle / Collect',  chain:'Ronin',       players:'14,200', cost:'Free',   hex:'#ff6b35', desc:"The current flagship of the Axie universe. Build a team of NFT Axies, master a deep card-battle system, and earn SLP and AXS tokens in ranked PvP play.",          url:'https://axieinfinity.com', assets: { poster_left:'/stores/axie/key_art_1.jpg', poster_right:'/stores/axie/key_art_2.jpg', logo:'/stores/axie/logo.jpg', banner:'/stores/axie/banner.jpg' } },
  gods:      { name:'Gods Unchained',         wing:'FOOD COURT',   genre:'Card / Strategy',   chain:'Immutable X', players:'9,800',  cost:'Free',   hex:'#ffc42a', desc:"Free tactical card game — your cards are NFTs you truly own. Build powerful decks, earn GODS tokens.",                                                                  url:'https://godsunchained.com' },
  illuvium:  { name:'Illuvium',               wing:'RPG WING',     genre:'RPG / Auto-Battle', chain:'Immutable X', players:'6,100',  cost:'$0-50',  hex:'#9b5fff', desc:"AAA open-world RPG on blockchain. Explore alien landscapes, capture Illuvials, battle in arenas. Zero gas fees.",                                                        url:'https://illuvium.io' },
  bigtime:   { name:'Big Time',               wing:'RPG WING',     genre:'Action RPG',        chain:'Multi-chain', players:'11,500', cost:'Free',   hex:'#00ff88', desc:"Fast-paced co-op RPG through time and space. Earn BIGTIME tokens, collect rare NFT cosmetics.",                                                                           url:'https://bigtime.gg' },
  sandbox:   { name:'The Sandbox',            wing:'STRATEGY WING',genre:'Build / Create',    chain:'Ethereum',    players:'8,400',  cost:'Free',   hex:'#00d4ff', desc:"Virtual world where you build, own, and monetize gaming experiences. Trade LAND, earn SAND tokens.",                                                                     url:'https://sandbox.game' },
  staratlas: { name:'Star Atlas',             wing:'STRATEGY WING',genre:'Space / Strategy',  chain:'Solana',      players:'3,200',  cost:'$5-100', hex:'#ff3366', desc:"Grand strategy in Unreal Engine 5 on Solana. Own ships, planets, and crew. Player-driven galactic economy.",                                                             url:'https://staratlas.com' },
  decentral: { name:'Decentraland',           wing:'MAIN HALL',    genre:'Virtual World',     chain:'Ethereum',    players:'7,600',  cost:'Free',   hex:'#f72585', desc:"Decentralized virtual reality platform. Create, explore, and trade in a world entirely owned by its users.",                                                             url:'https://decentraland.org' },
  splinter:  { name:'Splinterlands',          wing:'MAIN HALL',    genre:'Card / Battle',     chain:'Hive',        players:'5,300',  cost:'$10',    hex:'#4cc9f0', desc:"Digital collectible card game on blockchain. Battle in ranked matches, earn DEC tokens, trade freely.",                                                                   url:'https://splinterlands.com' },

  // ── Axie Hall flagships ───────────────────────────────────────
  atia:      { name:"Atia's Legacy",          wing:'AXIE HALL',    genre:'Action RPG',        chain:'Ronin',       players:'5,600',  cost:'Free',   hex:'#a855f7', desc:"Sky Mavis newest chapter in the Axie universe. A mobile-first action RPG set in the world of Lunacia — recruit Axies, master combat, and uncover the secrets of Atia.", url:'https://hub.skymavis.com/games/atias-legacy', assets: { poster_left: ['/stores/legacy/key_art_1.jpg', '/stores/legacy/key_art_3.jpg'], poster_right: ['/stores/legacy/key_art_2.jpg', '/stores/legacy/key_art_4.jpg'], logo: '/stores/legacy/logo.jpg', banner: '/stores/legacy/banner.jpg' } },

  // ── Axie Game-Verse Wing — Racing & Arcade ───────────────────
  infinitysoccer: { name:'Infinity Soccer', wing:'AXIE ARCADE', genre:'Sports / Competitive', chain:'Ronin', players:'2,100', cost:'Free', hex:'#00e5ff',
    desc:"1v1 competitive soccer where each match lasts 90 seconds. Axie card attributes map directly to your team body parts, making every Axie a unique player on the pitch.",
    url:'https://hub.skymavis.com/games/infinity-soccer' },

  tinydrift: { name:'Tiny Drift', wing:'AXIE ARCADE', genre:'Racing / Casual', chain:'Ronin', players:'3,800', cost:'Free', hex:'#ff8c00',
    desc:"Put your Axies behind the wheel and zip around kart tracks. Earn up to 1,000 AXP per Axie per day in PvE Adventure Mode — the fastest way to level up your squad.",
    url:'https://hub.skymavis.com/games/tiny-drift' },

  lunaciacup: { name:'Lunacia Cup', wing:'AXIE ARCADE', genre:'Racing Simulator', chain:'Ronin', players:'1,400', cost:'Free', hex:'#ffd700',
    desc:"One of the first community-built Greenlight titles. A racing simulator set across the landscapes of Lunacia where your Axies compete for glory on the circuit.",
    url:'https://hub.skymavis.com/greenlight' },

  axieball: { name:'Axie Ball', wing:'AXIE ARCADE', genre:'Sports / Arcade', chain:'Ronin', players:'900', cost:'Free', hex:'#64d860',
    desc:"Physics-based sports arcade title born from the Axie Game Jam. Fast, frantic, and accessible — get your Axies into the arena and score before time runs out.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Puzzle & Idle ─────────────────────
  axiequest: { name:'Axie Quest', wing:'AXIE PUZZLE', genre:'Match-3 RPG', chain:'Ronin', players:'4,200', cost:'Free', hex:'#c77dff',
    desc:"Match-3 puzzle adventure with an RPG twist. Swap tiles to cast spells and defeat monsters, with micro-progression powered by Rainbow Gem Packages from the Mavis Store.",
    url:'https://hub.skymavis.com/greenlight' },

  puzzlechamps: { name:'Puzzle Champions', wing:'AXIE PUZZLE', genre:'Tile-Matching Battle', chain:'Ronin', players:'1,600', cost:'Free', hex:'#00cba9',
    desc:"Tile-matching puzzle battle game where Axie traits influence your abilities. Outmatch opponents across an ever-expanding grid of strategic combos.",
    url:'https://hub.skymavis.com/greenlight' },

  culinarywars: { name:'Culinary Wars', wing:'AXIE PUZZLE', genre:'Cooking / Time Management', chain:'Ronin', players:'800', cost:'Free', hex:'#ffb347',
    desc:"One of the inaugural Mavis Hub Greenlight titles. Manage your Axie-run kitchen under pressure — cook, plate, and serve before the rush overwhelms your crew.",
    url:'https://hub.skymavis.com/greenlight' },

  triforce: { name:'Tri-Force', wing:'AXIE PUZZLE', genre:'Strategy Puzzle', chain:'Ronin', players:'700', cost:'Free', hex:'#4fc3f7',
    desc:"Strategy-puzzle title launched alongside Culinary Wars during the Greenlight debut wave. Position your Axies on triangular grids and outmanoeuvre your opponent.",
    url:'https://hub.skymavis.com/greenlight' },

  denofmyst: { name:'Den of Mysteries', wing:'AXIE PUZZLE', genre:'Adventure / Exploration', chain:'Ronin', players:'1,100', cost:'Free', hex:'#ab47bc',
    desc:"Story-driven map exploration using environment and tile puzzles. Descend into Lunacia hidden depths, uncover ancient secrets, and guide your Axie through peril.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Action & Strategy ─────────────────
  skysmash: { name:'Axie Sky Smash', wing:'AXIE ACTION', genre:'Artillery / Turn-Based', chain:'Ronin', players:'2,900', cost:'Free', hex:'#ff4444',
    desc:"Turn-based 2D tactical artillery shooter inspired by Gunbound and Worms. Axie body parts map to powerful weapons. Fully destructible maps — no two battles play the same.",
    url:'https://hub.skymavis.com/greenlight' },

  axiewar: { name:'Axie Infinity War', wing:'AXIE ACTION', genre:'Multiplayer Shooter', chain:'Ronin', players:'2,300', cost:'Free', hex:'#ff1744',
    desc:"Real-time multiplayer arena shooter — pit your Axies against each other in intense combat zones. NFT traits become weapon loadouts in this action-packed Greenlight title.",
    url:'https://hub.skymavis.com/games/aiw' },

  trifields: { name:'Tri-Fields / Axie Fields', wing:'AXIE ACTION', genre:'Tactical Grid', chain:'Ronin', players:'1,200', cost:'Free', hex:'#4caf50',
    desc:"Tactical grid-based deployment game. Place your Axies on the battlefield, exploit terrain advantages, and execute strategies that turn body-part traits into decisive weapons.",
    url:'https://hub.skymavis.com/greenlight' },

  acrosslunacia: { name:'Across Lunacia', wing:'AXIE ACTION', genre:'Platformer / Adventure', chain:'Ronin', players:'1,800', cost:'Free', hex:'#29b6d2',
    desc:"Side-scrolling adventure platformer — explore Lunacia using your own NFT Axies. Run, jump, and battle through hand-crafted levels while Axie traits shape how you play.",
    url:'https://hub.skymavis.com/greenlight' },

  tacticards: { name:'Tacticards', wing:'AXIE ACTION', genre:'Card Game / Deck-Building', chain:'Ronin', players:'1,500', cost:'Free', hex:'#f7c75a',
    desc:"Digital tabletop card game built on custom Axie deck-building mechanics. Draft your hand, deploy your Axies, and outthink opponents in deep strategic card battles.",
    url:'https://hub.skymavis.com/greenlight' },
}

// ── Cell ID constants ─────────────────────────────────────────
export const CELL = {
  FLOOR: 0,
  WALL:  1,
  // Original stores
  AX: 10, GO: 11, IL: 12, BT: 13,
  SB: 14, SA: 15, DC: 16, SP: 17,
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
}

export const CELL_STORE = {
  [10]:'axie',       [11]:'gods',
  [12]:'illuvium',   [13]:'bigtime',
  [14]:'sandbox',    [15]:'staratlas',
  [16]:'decentral',  [17]:'splinter',
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
}

// ── Map dimensions ────────────────────────────────────────────
export const MAP_W = 50
export const MAP_H = 80

export const CX1 = 19   // main corridor west x
export const CX2 = 24   // main corridor east x

// ── Build the map grid ────────────────────────────────────────
export const MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(1))

function carve(x1, y1, x2, y2) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) MAP[y][x] = 0
}

function place(x, y, id) {
  if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) MAP[y][x] = id
}

// ── Original wings ────────────────────────────────────────────
carve(14, 72, 29, 78)        // LOBBY
carve(CX1, 58, CX2, 71)     // MAIN HALL corridor
carve(11, 45, 32, 57)        // FOOD COURT
carve(1,  48, 10,  52)       // RPG WING
carve(33, 48, 42,  52)       // STRATEGY WING

// ── Axie Hall — connector north from Food Court ───────────────
carve(CX1, 25, CX2, 44)     // AXIE HALL corridor  x:19-24, y:25-44

// ── Axie Lobby — wide hub at top of hall ─────────────────────
carve(11, 20, 32, 24)        // AXIE LOBBY          x:11-32, y:20-24

// ── Three sub-wings branching from Axie Lobby ────────────────
carve(1,  8, 10,  24)        // ARCADE WING (west)   x:1-10,  y:8-24
carve(33, 8, 44,  24)        // PUZZLE WING (east)   x:33-44, y:8-24
carve(11, 3, 32,  17)        // ACTION WING (north)  x:11-32, y:3-17

// ── Action Wing doorway through its south wall into lobby ─────
carve(CX1, 18, CX2, 19)     // doorway x:19-24, y:18-19

// ── North stub — future expansion point ──────────────────────
carve(CX1, 1, CX2,  2)      // stub x:19-24, y:1-2

// ── Original store placements ─────────────────────────────────
;[58,59,60,61].forEach(y => { place(18, y, 16); place(25, y, 17) })   // Main Hall
;[3,4,5,6].forEach(x    => { place(x, 47, 12); place(x, 53, 13) })    // RPG Wing
;[35,36,37,38].forEach(x => { place(x, 47, 14); place(x, 53, 15) })   // Strategy Wing

// Gods Unchained — south wall of Food Court
;[11,12,13,14].forEach(x => place(x, 58, 11))

// ── Axie Hall flagship stores ─────────────────────────────────
;[30,31,32,33].forEach(y => place(18, y, 10))   // Origins   — west wall
;[30,31,32,33].forEach(y => place(25, y, 32))   // Atia's Legacy — east wall

// ── Arcade Wing stores — west wall (x=0) player looks west ───
;[8,9,10].forEach(y    => place(0, y, 18))   // Infinity Soccer
;[12,13,14].forEach(y  => place(0, y, 19))   // Tiny Drift
;[16,17,18].forEach(y  => place(0, y, 20))   // Lunacia Cup
;[20,21,22].forEach(y  => place(0, y, 21))   // Axie Ball

// ── Puzzle Wing stores — east wall (x=45) player looks east ──
;[8,9,10].forEach(y    => place(45, y, 22))   // Axie Quest
;[11,12,13].forEach(y  => place(45, y, 23))   // Puzzle Champions
;[14,15,16].forEach(y  => place(45, y, 24))   // Culinary Wars
;[17,18,19].forEach(y  => place(45, y, 25))   // Tri-Force
;[20,21,22].forEach(y  => place(45, y, 26))   // Den of Mysteries

// ── Action Wing stores — south wall (y=18) player looks south ─
// Doorway at x:19-24 splits the wall into left and right banks
;[11,12].forEach(x  => place(x, 18, 27))   // Axie Sky Smash
;[14,15].forEach(x  => place(x, 18, 28))   // Axie Infinity War
;[17,18].forEach(x  => place(x, 18, 29))   // Tri-Fields
;[25,26].forEach(x  => place(x, 18, 30))   // Across Lunacia
;[28,29].forEach(x  => place(x, 18, 31))   // Tacticards

// ── Zone lookup ───────────────────────────────────────────────
export function getZone(x, y) {
  if (y < 8 && x >= CX1 && x <= CX2 && y <= 2)
    return { id: 'FUTURE', label: '🚧  COMING SOON' }
  if (y <= 17 && x >= 11 && x <= 32)
    return { id: 'AXIE ACTION', label: '⚔  ACTION & STRATEGY  · Axie Greenlight' }
  if (y <= 19 && x >= CX1 && x <= CX2)
    return { id: 'AXIE HALL', label: '🎮  AXIE INFINITY WING' }
  if (y <= 24 && x <= 10)
    return { id: 'AXIE ARCADE', label: '🏎  RACING & ARCADE  · Axie Greenlight' }
  if (y <= 24 && x >= 33)
    return { id: 'AXIE PUZZLE', label: '🧩  PUZZLE & IDLE  · Axie Greenlight' }
  if (y >= 20 && y <= 24)
    return { id: 'AXIE LOBBY', label: '🎮  AXIE INFINITY  · Lobby' }
  if (x >= CX1 && x <= CX2 && y >= 25 && y <= 44)
    return { id: 'AXIE HALL', label: '🎮  AXIE INFINITY WING' }
  if (y >= 45 && y <= 57)                                      return { id: 'FOOD COURT',    label: 'FOOD COURT' }
  if (y > 71)                                                   return { id: 'LOBBY',         label: 'LOBBY' }
  if (y >= 58 && x >= CX1-1 && x <= CX2+1)                    return { id: 'MAIN HALL',     label: 'MAIN HALL' }
  if (y >= 48 && y <= 52 && x <= 10)                           return { id: 'RPG WING',      label: '⚔  RPG WING  · Adventure' }
  if (y >= 48 && y <= 52 && x >= 33)                           return { id: 'STRATEGY WING', label: '🏗  STRATEGY WING  · Build' }
  return { id: 'THE OUTLET', label: 'THE OUTLET' }
}

// ── Store geometry ────────────────────────────────────────────
// dir:'v' = cells along y axis (constant x wall face)
// dir:'h' = cells along x axis (constant y wall face)
// ax,ay = first (lowest index) cell of store face
// size  = number of cells across the full facade
export const STORE_GEOMETRY = {
  // Main Hall
  decentral: { ax:18, ay:58, dir:'v', size:4 },
  splinter:  { ax:25, ay:58, dir:'v', size:4 },
  // RPG Wing
  illuvium:  { ax: 3, ay:47, dir:'h', size:4 },
  bigtime:   { ax: 3, ay:53, dir:'h', size:4 },
  // Strategy Wing
  sandbox:   { ax:35, ay:47, dir:'h', size:4 },
  staratlas: { ax:35, ay:53, dir:'h', size:4 },
  // Food Court
  gods:      { ax:11, ay:58, dir:'h', size:4 },
  // Axie Hall flagships
  axie:      { ax:18, ay:30, dir:'v', size:4 },
  atia:      { ax:25, ay:30, dir:'v', size:4 },
  // Arcade Wing — west wall (x=0)
  infinitysoccer: { ax:0, ay: 8, dir:'v', size:3 },
  tinydrift:      { ax:0, ay:12, dir:'v', size:3 },
  lunaciacup:     { ax:0, ay:16, dir:'v', size:3 },
  axieball:       { ax:0, ay:20, dir:'v', size:3 },
  // Puzzle Wing — east wall (x=45)
  axiequest:    { ax:45, ay: 8, dir:'v', size:3 },
  puzzlechamps: { ax:45, ay:11, dir:'v', size:3 },
  culinarywars: { ax:45, ay:14, dir:'v', size:3 },
  triforce:     { ax:45, ay:17, dir:'v', size:3 },
  denofmyst:    { ax:45, ay:20, dir:'v', size:3 },
  // Action Wing — south wall (y=18), split around doorway at x:19-24
  skysmash:      { ax:11, ay:18, dir:'h', size:2 },
  axiewar:       { ax:14, ay:18, dir:'h', size:2 },
  trifields:     { ax:17, ay:18, dir:'h', size:2 },
  acrosslunacia: { ax:25, ay:18, dir:'h', size:2 },
  tacticards:    { ax:28, ay:18, dir:'h', size:2 },
}

// ── Minimap zone colours ──────────────────────────────────────
export const WING_COLORS = {
  'RPG WING':      '#9b5fff',
  'STRATEGY WING': '#00d4ff',
  'MAIN HALL':     '#f72585',
  'FOOD COURT':    '#ffd700',
  'AXIE HALL':     '#ff6b35',
  'AXIE LOBBY':    '#ff9d00',
  'AXIE ARCADE':   '#ff8c00',
  'AXIE PUZZLE':   '#c77dff',
  'AXIE ACTION':   '#ff4444',
  'FUTURE':        '#333333',
}
