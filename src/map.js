// ═══════════════════════════════════════════════════════════════
// map.js — The Outlet tile map + store data
// 0 = floor, 1 = wall, 10–17 = original stores, 18–32 = Axie wing
// ═══════════════════════════════════════════════════════════════

// ── Store data ────────────────────────────────────────────────
export const STORES = {
  // ── Ronin flagship stores ─────────────────────────────────────
  axie:      { name:'Axie Infinity: Origins', wing:'AXIE HALL',    genre:'Battle / Collect',  chain:'Ronin', players:'14,200', cost:'Free',   hex:'#ff6b35', desc:"The flagship of the Axie universe. Build a team of NFT Axies, master a deep card-battle system, and earn SLP and AXS tokens in ranked PvP play.", url:'https://axieinfinity.com', assets: { poster_left:'/stores/axie/key_art_1.jpg', poster_right:'/stores/axie/key_art_2.jpg', logo:'/stores/axie/logo.jpg', banner:'/stores/axie/banner.jpg' } },
  pixels:    { name:'Pixels',                 wing:'MAIN HALL',    genre:'RPG / Farming',     chain:'Ronin', players:'18,000', cost:'Free',   hex:'#7ed321', desc:"Farm, build, and explore in this open-world pixel RPG. Own land, grow resources, and trade in a player-driven economy on Ronin.",                  url:'https://play.pixels.xyz' },
  lumiterra: { name:'Lumiterra',              wing:'MAIN HALL',    genre:'Action RPG',        chain:'Ronin', players:'6,800',  cost:'Free',   hex:'#f5a623', desc:"Multiplayer action RPG with survival crafting. Explore dungeons, harvest resources, and battle monsters with your NFT characters on Ronin.",         url:'https://marketplace.skymavis.com/games/lumiterra' },
  wildforest: { name:'Wild Forest',           wing:'FOOD COURT',   genre:'RTS / Strategy',    chain:'Ronin', players:'9,200',  cost:'Free',   hex:'#2ecc71', desc:"Real-time strategy on Ronin. Build bases, command troops, and deploy powerful unit NFTs in fast-paced PvP battles. Earn WOFR tokens.",              url:'https://playwildforest.io' },
  apeiron:   { name:'Apeiron',                wing:'RPG WING',     genre:'RPG / Roguelite',   chain:'Ronin', players:'5,100',  cost:'Free',   hex:'#8e44ad', desc:"Godgame roguelite RPG where you shape planets and command Apostles into battle. NFT planet ownership drives the Apeiron universe on Ronin.",      url:'https://apeiron.fooniemagus.com' },
  lastodyssey:{ name:'Last Odyssey',          wing:'RPG WING',     genre:'Strategy / RPG',    chain:'Ronin', players:'3,400',  cost:'Free',   hex:'#1abc9c', desc:"Tactical strategy RPG set in a post-apocalyptic world. Command heroes, forge alliances, and compete for resources in this Ronin-native title.",    url:'https://lastodyssey.io' },
  kaidro:    { name:'Kaidro: Clan Battles',   wing:'STRATEGY WING',genre:'Action / Battle',   chain:'Ronin', players:'4,600',  cost:'Free',   hex:'#e74c3c', desc:"Cyberpunk mech battle game. Choose your clan, pilot your Kaidro NFT, and fight for dominance in intense real-time arena combat on Ronin.",         url:'https://marketplace.skymavis.com/games/kaidro' },
  machines:  { name:'The Machines Arena',     wing:'STRATEGY WING',genre:'MOBA / Shooter',    chain:'Ronin', players:'7,300',  cost:'Free',   hex:'#3498db', desc:"Top-down tactical MOBA shooter. Command robots, capture objectives, and battle in team-based arenas. Fast-paced Web3 competitive gaming on Ronin.", url:'https://marketplace.skymavis.com/games/the-machines-arena' },

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
}

// ── Map dimensions ────────────────────────────────────────────
export const MAP_W = 512
export const MAP_H = 512

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

// ── East Lobby — attached to east end of Strategy Wing ────────
// Strategy Wing (x:33-42, y:48-52) opens into this lobby at x=42/43, y:48-52
carve(43, 44, 64, 56)        // EAST LOBBY             x:43-64, y:44-56 (22w)

// ── Original store placements ─────────────────────────────────
;[58,59,60,61].forEach(y => { place(18, y, 16); place(25, y, 17) })   // Main Hall
;[3,4,5,6].forEach(x    => { place(x, 47, 12); place(x, 53, 13) })    // RPG Wing
;[35,36,37,38].forEach(x => { place(x, 47, 14); place(x, 53, 15) })   // Strategy Wing

// Gods Unchained — south wall of Food Court
;[11,12,13,14].forEach(x => place(x, 58, 11))

// ── Axie Hall flagship stores ─────────────────────────────────
;[30,31,32,33].forEach(y => place(18, y, 10))   // Origins   — west wall
;[30,31,32,33].forEach(y => place(25, y, 32))   // Atia's Legacy — east wall

// ── Axie Game-Verse Wing — 8 walls, all size:4 ───────────────
// W1  Arcade West  (x=0, dir:v)
;[8,9,10,11].forEach(y    => place(0, y, 18))   // Infinity Soccer
;[12,13,14,15].forEach(y  => place(0, y, 19))   // Tiny Drift

// W2  Arcade North  (y=7, dir:h)  — end caps: x=0 and x=9-10 stay wall
;[1,2,3,4].forEach(x  => place(x, 7, 20))   // Lunacia Cup
;[5,6,7,8].forEach(x  => place(x, 7, 21))   // Axie Ball

// W3  Puzzle East  (x=45, dir:v)
;[8,9,10,11].forEach(y    => place(45, y, 22))   // Axie Quest
;[12,13,14,15].forEach(y  => place(45, y, 23))   // Puzzle Champions
;[16,17,18,19].forEach(y  => place(45, y, 24))   // Culinary Wars

// W4  Puzzle North  (y=7, dir:h)  — end cap: x=33 corner stays wall
;[34,35,36,37].forEach(x  => place(x, 7, 25))   // Tri-Force
;[38,39,40,41].forEach(x  => place(x, 7, 26))   // Den of Mysteries

// W5  Action South-Left  (y=18, x:11-18)
;[11,12,13,14].forEach(x  => place(x, 18, 27))   // Axie Sky Smash
;[15,16,17,18].forEach(x  => place(x, 18, 28))   // Axie Infinity War

// W6  Action South-Right  (y=18, x:25-28) — x=29-32 stays plain
;[25,26,27,28].forEach(x  => place(x, 18, 29))   // Tri-Fields

// W7  Action West  (x=10, y:3-6)  — y=2 north corner and y=7 stay wall
;[3,4,5,6].forEach(y  => place(10, y, 31))   // Tacticards

// W8  Action East  (x=33, y:3-6)  — y=2 north corner and y=7 stay wall
;[3,4,5,6].forEach(y  => place(33, y, 30))   // Across Lunacia

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
  if (y >= 48 && y <= 52 && x >= 33 && x <= 42)                return { id: 'STRATEGY WING', label: '🏗  STRATEGY WING  · Build' }
  if (x >= 43 && x <= 64 && y >= 44 && y <= 56)               return { id: 'EAST LOBBY',    label: '🌐  EAST LOBBY' }
  return { id: 'THE OUTLET', label: 'THE OUTLET' }
}

// ── Store geometry ────────────────────────────────────────────
// dir:'v' = cells along y axis (constant x wall face)
// dir:'h' = cells along x axis (constant y wall face)
// ax,ay = first (lowest index) cell of store face
// size  = number of cells across the full facade
export const STORE_GEOMETRY = {
  // Main Hall
  pixels:    { ax:18, ay:58, dir:'v', size:4 },
  lumiterra: { ax:25, ay:58, dir:'v', size:4 },
  // RPG Wing
  apeiron:     { ax: 3, ay:47, dir:'h', size:4 },
  lastodyssey: { ax: 3, ay:53, dir:'h', size:4 },
  // Strategy Wing
  kaidro:    { ax:35, ay:47, dir:'h', size:4 },
  machines:  { ax:35, ay:53, dir:'h', size:4 },
  // Food Court
  wildforest: { ax:11, ay:58, dir:'h', size:4 },
  // Axie Hall flagships
  axie:      { ax:18, ay:30, dir:'v', size:4 },
  atia:      { ax:25, ay:30, dir:'v', size:4 },
  // W1  Arcade West  (x=0, dir:v)
  infinitysoccer: { ax:0, ay: 8, dir:'v', size:4 },
  tinydrift:      { ax:0, ay:12, dir:'v', size:4 },
  // W2  Arcade North  (y=7, dir:h)
  lunaciacup:     { ax:1, ay: 7, dir:'h', size:4 },
  axieball:       { ax:5, ay: 7, dir:'h', size:4 },
  // W3  Puzzle East  (x=45, dir:v)
  axiequest:    { ax:45, ay: 8, dir:'v', size:4 },
  puzzlechamps: { ax:45, ay:12, dir:'v', size:4 },
  culinarywars: { ax:45, ay:16, dir:'v', size:4 },
  // W4  Puzzle North  (y=7, dir:h)
  triforce:     { ax:34, ay: 7, dir:'h', size:4 },
  denofmyst:    { ax:38, ay: 7, dir:'h', size:4 },
  // W5  Action South-Left  (y=18, x:11-18)
  skysmash:      { ax:11, ay:18, dir:'h', size:4 },
  axiewar:       { ax:15, ay:18, dir:'h', size:4 },
  // W6  Action South-Right  (y=18, x:25-28)
  trifields:     { ax:25, ay:18, dir:'h', size:4 },
  // W7  Action West  (x=10, y:3-6)
  tacticards:    { ax:10, ay: 3, dir:'v', size:4 },
  // W8  Action East  (x=33, y:3-6)
  acrosslunacia: { ax:33, ay: 3, dir:'v', size:4 },
}

// ── Minimap zone colours ────────────────────────────────────────────────
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
  'EAST LOBBY':    '#ff9800',
}
