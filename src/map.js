// ═══════════════════════════════════════════════════════════════
// map.js — The Outlet tile map + store data
// 0 = floor, 1 = wall, 10–17 = original stores, 18–32 = Axie wing
// ═══════════════════════════════════════════════════════════════

// ── Store data ────────────────────────────────────────────────
export const STORES = {
  // ── Ronin flagship stores ─────────────────────────────────────
  axie:      { name:'Axie Infinity: Origins', wing:'AXIE FRANCHISE',    genre:'Battle / Collect',  chain:'Ronin', players:'14,200', cost:'Free',   hex:'#ff6b35', desc:"The flagship of the Axie universe. Build a team of NFT Axies, master a deep card-battle system, and earn SLP and AXS tokens in ranked PvP play.", url:'https://hub.skymavis.com/games/axie-infinity-origins', assets: { poster_left:'/stores/axie/key_art_1.jpg', poster_right:'/stores/axie/key_art_2.jpg', logo:'/stores/axie/logo.jpg', banner:'/stores/axie/banner.jpg' } },
  pixels:    { name:'Pixels',                 wing:'SIMULATION HALL',    genre:'RPG / Farming',     chain:'Ronin', players:'18,000', cost:'Free',   hex:'#7ed321', desc:"Farm, build, and explore in this open-world pixel RPG. Own land, grow resources, and trade in a player-driven economy on Ronin.",                  url:'https://play.pixels.xyz' },
  lumiterra: { name:'Lumiterra',              wing:'SIMULATION HALL',    genre:'Action RPG',        chain:'Ronin', players:'6,800',  cost:'Free',   hex:'#f5a623', desc:"Multiplayer action RPG with survival crafting. Explore dungeons, harvest resources, and battle monsters with your NFT characters on Ronin.",         url:'https://marketplace.skymavis.com/games/lumiterra' },
  wildforest: { name:'Wild Forest',           wing:'STRATEGY HALL',   genre:'RTS / Strategy',    chain:'Ronin', players:'9,200',  cost:'Free',   hex:'#2ecc71', desc:"Real-time strategy on Ronin. Build bases, command troops, and deploy powerful unit NFTs in fast-paced PvP battles. Earn WOFR tokens.",              url:'https://playwildforest.io' },
  apeiron:   { name:'Apeiron',                wing:'ADVENTURE HALL',     genre:'RPG / Roguelite',   chain:'Ronin', players:'5,100',  cost:'Free',   hex:'#8e44ad', desc:"Godgame roguelite RPG where you shape planets and command Apostles into battle. NFT planet ownership drives the Apeiron universe on Ronin.",      url:'https://apeiron.fooniemagus.com' },
  lastodyssey:{ name:'Last Odyssey',          wing:'ADVENTURE HALL',     genre:'Strategy / RPG',    chain:'Ronin', players:'3,400',  cost:'Free',   hex:'#1abc9c', desc:"Tactical strategy RPG set in a post-apocalyptic world. Command heroes, forge alliances, and compete for resources in this Ronin-native title.",    url:'https://lastodyssey.io' },
  kaidro:    { name:'Kaidro: Clan Battles',   wing:'STRATEGY HALL',genre:'Action / Battle',   chain:'Ronin', players:'4,600',  cost:'Free',   hex:'#e74c3c', desc:"Cyberpunk mech battle game. Choose your clan, pilot your Kaidro NFT, and fight for dominance in intense real-time arena combat on Ronin.",         url:'https://marketplace.skymavis.com/games/kaidro' },
  machines:  { name:'The Machines Arena',     wing:'STRATEGY HALL',genre:'MOBA / Shooter',    chain:'Ronin', players:'7,300',  cost:'Free',   hex:'#3498db', desc:"Top-down tactical MOBA shooter. Command robots, capture objectives, and battle in team-based arenas. Fast-paced Web3 competitive gaming on Ronin.", url:'https://marketplace.skymavis.com/games/the-machines-arena' },

  // ── Axie Hall flagships ───────────────────────────────────────
  atia:      { name:"Atia's Legacy",          wing:'AXIE FRANCHISE',    genre:'Action RPG',        chain:'Ronin',       players:'5,600',  cost:'Free',   hex:'#a855f7', desc:"Sky Mavis newest chapter in the Axie universe. A mobile-first action RPG set in the world of Lunacia — recruit Axies, master combat, and uncover the secrets of Atia.", url:'https://axieinfinity.com/', assets: { poster_left: ['/stores/legacy/key_art_1.jpg', '/stores/legacy/key_art_3.jpg'], poster_right: ['/stores/legacy/key_art_2.jpg', '/stores/legacy/key_art_4.jpg'], logo: '/stores/legacy/logo.jpg', banner: '/stores/legacy/banner.jpg' } },

  // ── Axie Game-Verse Wing — Racing & Arcade ───────────────────
  infinitysoccer: { name:'Infinity Soccer', wing:'SPORTS HALL', genre:'Sports / Competitive', chain:'Ronin', players:'2,100', cost:'Free', hex:'#00e5ff',
    desc:"1v1 competitive soccer where each match lasts 90 seconds. Axie card attributes map directly to your team body parts, making every Axie a unique player on the pitch.",
    url:'https://hub.skymavis.com/games/infinity-soccer' },

  tinydrift: { name:'Tiny Drift', wing:'SPORTS HALL', genre:'Racing / Casual', chain:'Ronin', players:'3,800', cost:'Free', hex:'#ff8c00',
    desc:"Put your Axies behind the wheel and zip around kart tracks. Earn up to 1,000 AXP per Axie per day in PvE Adventure Mode — the fastest way to level up your squad.",
    url:'https://hub.skymavis.com/games/tiny-drift' },

  lunaciacup: { name:'Lunacia Cup', wing:'SPORTS HALL', genre:'Racing Simulator', chain:'Ronin', players:'1,400', cost:'Free', hex:'#ffd700',
    desc:"One of the first community-built Greenlight titles. A racing simulator set across the landscapes of Lunacia where your Axies compete for glory on the circuit.",
    url:'https://hub.skymavis.com/greenlight' },

  axieball: { name:'Axie Ball', wing:'SPORTS HALL', genre:'Sports / Arcade', chain:'Ronin', players:'900', cost:'Free', hex:'#64d860',
    desc:"Physics-based sports arcade title born from the Axie Game Jam. Fast, frantic, and accessible — get your Axies into the arena and score before time runs out.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Puzzle & Idle ─────────────────────
  axiequest: { name:'Axie Quest', wing:'PUZZLE HALL', genre:'Match-3 RPG', chain:'Ronin', players:'4,200', cost:'Free', hex:'#c77dff',
    desc:"Match-3 puzzle adventure with an RPG twist. Swap tiles to cast spells and defeat monsters, with micro-progression powered by Rainbow Gem Packages from the Mavis Store.",
    url:'https://hub.skymavis.com/greenlight' },

  puzzlechamps: { name:'Puzzle Champions', wing:'PUZZLE HALL', genre:'Tile-Matching Battle', chain:'Ronin', players:'1,600', cost:'Free', hex:'#00cba9',
    desc:"Tile-matching puzzle battle game where Axie traits influence your abilities. Outmatch opponents across an ever-expanding grid of strategic combos.",
    url:'https://hub.skymavis.com/greenlight' },

  culinarywars: { name:'Culinary Wars', wing:'PUZZLE HALL', genre:'Cooking / Time Management', chain:'Ronin', players:'800', cost:'Free', hex:'#ffb347',
    desc:"One of the inaugural Mavis Hub Greenlight titles. Manage your Axie-run kitchen under pressure — cook, plate, and serve before the rush overwhelms your crew.",
    url:'https://hub.skymavis.com/greenlight' },

  triforce: { name:'Tri-Force', wing:'PUZZLE HALL', genre:'Strategy Puzzle', chain:'Ronin', players:'700', cost:'Free', hex:'#4fc3f7',
    desc:"Strategy-puzzle title launched alongside Culinary Wars during the Greenlight debut wave. Position your Axies on triangular grids and outmanoeuvre your opponent.",
    url:'https://hub.skymavis.com/greenlight' },

  denofmyst: { name:'Den of Mysteries', wing:'PUZZLE HALL', genre:'Adventure / Exploration', chain:'Ronin', players:'1,100', cost:'Free', hex:'#ab47bc',
    desc:"Story-driven map exploration using environment and tile puzzles. Descend into Lunacia hidden depths, uncover ancient secrets, and guide your Axie through peril.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Axie Game-Verse Wing — Action & Strategy ─────────────────
  skysmash: { name:'Axie Sky Smash', wing:'ACTION HALL', genre:'Artillery / Turn-Based', chain:'Ronin', players:'2,900', cost:'Free', hex:'#ff4444',
    desc:"Turn-based 2D tactical artillery shooter inspired by Gunbound and Worms. Axie body parts map to powerful weapons. Fully destructible maps — no two battles play the same.",
    url:'https://hub.skymavis.com/greenlight' },

  axiewar: { name:'Axie Infinity War', wing:'ACTION HALL', genre:'Multiplayer Shooter', chain:'Ronin', players:'2,300', cost:'Free', hex:'#ff1744',
    desc:"Real-time multiplayer arena shooter — pit your Axies against each other in intense combat zones. NFT traits become weapon loadouts in this action-packed Greenlight title.",
    url:'https://hub.skymavis.com/games/aiw' },

  trifields: { name:'Tri-Fields / Axie Fields', wing:'FIGHTER WING', genre:'Tactical Grid', chain:'Ronin', players:'1,200', cost:'Free', hex:'#4caf50',
    desc:"Tactical grid-based deployment game. Place your Axies on the battlefield, exploit terrain advantages, and execute strategies that turn body-part traits into decisive weapons.",
    url:'https://hub.skymavis.com/greenlight' },

  acrosslunacia: { name:'Across Lunacia', wing:'FIGHTER WING', genre:'Platformer / Adventure', chain:'Ronin', players:'1,800', cost:'Free', hex:'#29b6d2',
    desc:"Side-scrolling adventure platformer — explore Lunacia using your own NFT Axies. Run, jump, and battle through hand-crafted levels while Axie traits shape how you play.",
    url:'https://hub.skymavis.com/greenlight' },

  tacticards: { name:'Tacticards', wing:'ACTION HALL', genre:'Card Game / Deck-Building', chain:'Ronin', players:'1,500', cost:'Free', hex:'#f7c75a',
    desc:"Digital tabletop card game built on custom Axie deck-building mechanics. Draft your hand, deploy your Axies, and outthink opponents in deep strategic card battles.",
    url:'https://hub.skymavis.com/greenlight' },

  // ── Discovery Wing — Forged on Ronin (metadata: ronin-storefront-metadata.md) ──
  ragnarokgenesis: { name:'Ragnarok Landverse: Genesis', wing:'ADVENTURE HALL', genre:'MMORPG', chain:'Ronin', players:'—', cost:'Free', hex:'#358FBD',  // display variant of brand #0C3C54 (too dark for marquee)
    desc:"Return to Rune Midgard in the free-to-play Web3 revival of Ragnarok Online. Quest, grind, and battle MVPs while mining on-chain resources and trading NFT gear and land on Ronin.",
    url:'https://rolg.maxion.gg' },
  ragnarokamerica: { name:'Ragnarok Landverse America', wing:'ADVENTURE HALL', genre:'MMORPG', chain:'Ronin', players:'120,000+', cost:'Free', hex:'#326ED2',
    desc:"Classic Ragnarok Online rebuilt for North and Latin America. Level up, party for MVP hunts, and earn ION tokens, with items and land minted as tradable NFTs on Ronin.",
    url:'https://rola.maxion.gg' },
  aquariumquest: { name:'Aquarium Quest', wing:'RPG HALL', genre:'Cozy Pet Sim', chain:'Ronin', players:'—', cost:'Free', hex:'#0CB4FC',
    desc:"Collect, breed, and raise aquatic pets in a cozy pixel-art aquarium. Decorate tanks, compete in arcade minigames, and earn RON rewards, with Founders Passes tradable on Ronin.",
    url:'https://play.aquarium.quest' },
  thebeacon: { name:'The Beacon', wing:'ADVENTURE HALL', genre:'Action Roguelite', chain:'Ronin', players:'—', cost:'Free', hex:'#5A96D2',
    desc:"Fight through procedurally generated dungeons in this fantasy action roguelite RPG. Clear runs solo or co-op, collect cosmetic and housing NFTs, and earn on-chain rewards via Ronin playtests.",
    url:'https://thebeacon.gg' },

  // ── Community Wing — Forged on Ronin ──────────────────────────
  partyicons: { name:'PARTY ICONS', wing:'RPG HALL', genre:'Party Battle Royale', chain:'Ronin', players:'—', cost:'Free', hex:'#FC3CCC',
    desc:"Jump into a multiplayer party royale spanning Party Heist and 25+ Carnival Clash minigames. Compete, climb, and let OGX Hero NFT holders shape events in real time on Ronin.",
    url:'https://www.partyicons.com' },
  calamity: { name:'Calamity', wing:'RPG HALL', genre:'2D Action MMORPG', chain:'Ronin', players:'—', cost:'Free', hex:'#FAD25A',
    desc:"Carve your path through a hardcore 2D MMORPG of dungeons, bosses, and survival trials. Master three classes and 40+ skills, with Dragon Ring NFTs and player trading secured on Ronin.",
    url:'https://app.calamity.online' },
  fableborne: { name:'Fableborne', wing:'RPG HALL', genre:'ARPG × Strategy', chain:'Ronin', players:'—', cost:'Free', hex:'#FAE646',
    desc:"Raid enemy kingdoms in quick ARPG battles, then fortify your own. Diablo-meets-Clash strategy with collectible heroes, Kingdoms NFTs, and Essence earnings living on Ronin.",
    url:'https://fableborne.com' },

  // ── West Passage — Forged on Ronin ────────────────────────────
  fishingfrenzy: { name:'Fishing Frenzy', wing:'RPG HALL', genre:'Cozy Fishing RPG', chain:'Ronin', players:'25,000', cost:'Free', hex:'#18C8D8',
    desc:"Cast, hook, and reel in a cozy onchain fishing RPG. Cook your catch, upgrade gear, and complete quests in a player-driven economy powered by Ronin and the $FISH token.",
    url:'https://fishingfrenzy.co' },
  craftworld: { name:'Craft World', wing:'SIMULATION HALL', genre:'Co-op Crafting Sim', chain:'Ronin', players:'—', cost:'Free', hex:'#FC3C54',
    desc:"Team up with dynomites in a massive co-op crafting sim by VOYA Games. Gather, craft, and build artefacts in a post-apocalyptic world where every action feeds a player-owned onchain economy.",
    url:'https://www.angrydynomiteslab.com/craft-world' },
  chickensaga: { name:'Chicken Saga', wing:'TUTORIAL LOBBY', genre:'Breed & Battle', chain:'Ronin', players:'—', cost:'Free', hex:'#FAE66E',
    desc:"Collect, breed, battle, and trade NFT chickens with unique traits. Rub Genesis chickens for Feathers, craft items, and spend $COCK tokens in a player-driven economy on Ronin.",
    url:'https://app.sabongsaga.com' },
  grandarena: { name:'Grand Arena', wing:'TUTORIAL LOBBY', genre:'AI Fantasy Autobattler', chain:'Ronin', players:'—', cost:'Free', hex:'#246CE4',
    desc:"Draft Moki card NFTs and let AI-powered squads battle in daily fantasy-sports contests. Manage your roster, climb leaderboards, and chase seasonal prize pools on Ronin.",
    url:'https://fantasy.grandarena.gg' },
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

// ── Map dimensions ────────────────────────────────────────────
export const MAP_W = 512
export const MAP_H = 512

export const CX1 = 8    // sports hall west x
export const CX2 = 12   // sports hall east x

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

// ── Left wing — Sports Hall, Action Hall, Fighter Wing ────────
carve( 2,  2, 20,  8)   // RACING — wide room at top of sports hall
carve( 8,  2, 12, 28)   // SPORTS HALL — vertical corridor
carve( 8, 26, 34, 32)   // FOOD COURT — horizontal connector
carve( 2, 26, 14, 38)   // ACTION HALL — left side
carve( 2, 40, 20, 52)   // FIGHTER WING — platformer / fighting
carve( 6, 38, 12, 42)   // action ↔ fighter connector

// ── Center — Puzzle Hall ──────────────────────────────────────
carve(22,  8, 36, 32)   // PUZZLE HALL

// ── Upper right — Strategy Hall + Axie Franchise ─────────────
carve(34, 12, 40, 22)   // puzzle ↔ strategy connector
carve(38,  6, 52, 22)   // STRATEGY HALL
carve(50,  2, 66, 22)   // AXIE FRANCHISE

// ── Center right — Simulation Hall + Lobby ───────────────────
carve(42, 22, 58, 30)   // SIMULATION HALL
carve(36, 26, 42, 34)   // puzzle ↔ lobby connector
carve(40, 28, 54, 40)   // LOBBY

// ── Lower right — Adventure Hall, RPG Hall, Tutorial Lobby ───
carve(40, 40, 58, 54)   // ADVENTURE HALL
carve(26, 32, 30, 42)   // puzzle ↔ RPG connector
carve(20, 42, 36, 54)   // RPG HALL
carve(56, 48, 62, 56)   // adventure ↔ tutorial bridge
carve(62, 22, 76, 56)   // TUTORIAL LOBBY

// ── RACING / SPORTS HALL stores — north wall y=1 ─────────────
;[2,3,4,5].forEach(x     => place(x,  1, CELL.IS))   // Infinity Soccer
;[6,7,8,9].forEach(x     => place(x,  1, CELL.AB))   // Axie Ball
;[10,11,12,13].forEach(x => place(x,  1, CELL.TD))   // Tiny Drift
;[14,15,16,17].forEach(x => place(x,  1, CELL.LC))   // Lunacia Cup

// ── ACTION HALL stores — west wall x=1 ───────────────────────
;[26,27,28,29].forEach(y => place(1, y, CELL.SS))    // Sky Smash
;[30,31,32,33].forEach(y => place(1, y, CELL.AI))    // Axie Infinity War
;[34,35,36,37].forEach(y => place(1, y, CELL.TA))    // Tacticards

// ── FIGHTER WING stores — west wall x=1 ──────────────────────
;[41,42,43,44].forEach(y => place(1, y, CELL.TR))    // Tri-Fields
;[45,46,47,48].forEach(y => place(1, y, CELL.AL))    // Across Lunacia

// ── PUZZLE HALL stores — north wall y=7, west wall x=21 ──────
;[22,23,24,25].forEach(x => place(x,  7, CELL.AQ))  // Axie Quest
;[26,27,28,29].forEach(x => place(x,  7, CELL.PC))  // Puzzle Champions
;[30,31,32,33].forEach(x => place(x,  7, CELL.CW))  // Culinary Wars
;[8,9,10,11].forEach(y   => place(21, y, CELL.TF))  // Tri-Force
;[12,13,14,15].forEach(y => place(21, y, CELL.DM))  // Den of Mysteries

// ── STRATEGY HALL stores — north wall y=5 ────────────────────
;[38,39,40,41].forEach(x => place(x, 5, CELL.KD))   // Kaidro
;[42,43,44,45].forEach(x => place(x, 5, CELL.MA))   // Machines Arena
;[46,47,48,49].forEach(x => place(x, 5, CELL.WF))   // Wild Forest

// ── AXIE FRANCHISE stores — north wall y=1 ───────────────────
;[51,52,53,54].forEach(x => place(x, 1, CELL.AX))   // Axie Origins
;[55,56,57,58].forEach(x => place(x, 1, CELL.TL))   // Atia's Legacy

// ── SIMULATION HALL stores — east wall x=59, south wall y=31 ─
;[23,24,25,26].forEach(y => place(59, y, CELL.PX))  // Pixels
;[27,28,29,30].forEach(y => place(59, y, CELL.LT))  // Lumiterra
;[55,56,57,58].forEach(x => place(x, 31, CELL.CRW)) // Craft World

// ── ADVENTURE HALL stores — west wall x=39, east wall x=59 ───
;[40,41,42,43].forEach(y => place(39, y, CELL.AP))  // Apeiron
;[44,45,46,47].forEach(y => place(39, y, CELL.LO))  // Last Odyssey
;[48,49,50,51].forEach(y => place(39, y, CELL.RG))  // Ragnarok Genesis
;[40,41,42,43].forEach(y => place(59, y, CELL.RA))  // Ragnarok America
;[44,45,46,47].forEach(y => place(59, y, CELL.BC))  // The Beacon

// ── RPG HALL stores — north wall y=41, west wall x=19, south y=55
;[21,22,23,24].forEach(x => place(x, 41, CELL.AQ2)) // Aquarium Quest
;[31,32,33,34].forEach(x => place(x, 41, CELL.CL))  // Calamity
;[43,44,45,46].forEach(y => place(19, y, CELL.FF))  // Fishing Frenzy
;[47,48,49,50].forEach(y => place(19, y, CELL.PI))  // Party Icons
;[21,22,23,24].forEach(x => place(x, 55, CELL.FB))  // Fableborne

// ── TUTORIAL LOBBY stores — west wall x=61, south wall y=57 ──
;[23,24,25,26].forEach(y => place(61, y, CELL.TU1)) // The Outlet overview
;[27,28,29,30].forEach(y => place(61, y, CELL.TU2)) // Trading
;[31,32,33,34].forEach(y => place(61, y, CELL.TU3)) // DM Chat
;[35,36,37,38].forEach(y => place(61, y, CELL.TU4)) // Group Chat
;[39,40,41,42].forEach(y => place(61, y, CELL.TU5)) // Guild Halls
;[63,64,65,66].forEach(x => place(x, 57, CELL.CS))  // Chicken Saga
;[67,68,69,70].forEach(x => place(x, 57, CELL.GA))  // Grand Arena

// ── Zone lookup ───────────────────────────────────────────────
export function getZone(x, y) {
  // TUTORIAL LOBBY — far right
  if (x >= 62 && x <= 76 && y >= 22 && y <= 56)
    return { id: 'TUTORIAL LOBBY', label: '📖  TUTORIAL LOBBY  · Learn the basics' }
  if (x >= 56 && x <= 62 && y >= 48 && y <= 56)
    return { id: 'TUTORIAL LOBBY', label: '📖  TUTORIAL LOBBY  · Learn the basics' }
  // AXIE FRANCHISE — top right
  if (x >= 50 && x <= 66 && y >= 2 && y <= 22)
    return { id: 'AXIE FRANCHISE', label: '🎮  AXIE FRANCHISE  · Axie Infinity World' }
  // STRATEGY HALL — upper right (check both room and connector)
  if (x >= 38 && x <= 52 && y >= 6 && y <= 22)
    return { id: 'STRATEGY HALL', label: '🏗  STRATEGY HALL  · Build & Conquer' }
  if (x >= 34 && x <= 40 && y >= 12 && y <= 22)
    return { id: 'STRATEGY HALL', label: '🏗  STRATEGY HALL  · Build & Conquer' }
  // SIMULATION HALL
  if (x >= 42 && x <= 58 && y >= 22 && y <= 30)
    return { id: 'SIMULATION HALL', label: '🌍  SIMULATION HALL  · Worlds to Manage' }
  // LOBBY — includes puzzle→lobby connector
  if (x >= 36 && x <= 42 && y >= 26 && y <= 34)
    return { id: 'LOBBY', label: 'LOBBY' }
  if (x >= 40 && x <= 54 && y >= 28 && y <= 40)
    return { id: 'LOBBY', label: 'LOBBY' }
  // ADVENTURE HALL
  if (x >= 40 && x <= 58 && y >= 40 && y <= 54)
    return { id: 'ADVENTURE HALL', label: '⚔  ADVENTURE HALL  · Quest & Explore' }
  // RPG HALL — includes puzzle→RPG connector
  if (x >= 26 && x <= 30 && y >= 32 && y <= 42)
    return { id: 'RPG HALL', label: '🎲  RPG HALL  · Role Playing Games' }
  if (x >= 20 && x <= 36 && y >= 42 && y <= 54)
    return { id: 'RPG HALL', label: '🎲  RPG HALL  · Role Playing Games' }
  // PUZZLE HALL — before food court to claim the central overlap area
  if (x >= 22 && x <= 36 && y >= 8 && y <= 32)
    return { id: 'PUZZLE HALL', label: '🧩  PUZZLE HALL  · Match & Solve' }
  // SPORTS HALL — racing room at top, then corridor south
  if (x >= 2 && x <= 20 && y >= 2 && y <= 8)
    return { id: 'SPORTS HALL', label: '🏎  SPORTS HALL  · Race & Compete' }
  if (x >= 8 && x <= 12 && y >= 2 && y <= 28)
    return { id: 'SPORTS HALL', label: '🏎  SPORTS HALL  · Race & Compete' }
  // FOOD COURT — horizontal connector
  if (x >= 8 && x <= 34 && y >= 26 && y <= 32)
    return { id: 'FOOD COURT', label: '🍔  FOOD COURT  · Central Crossing' }
  // ACTION HALL — left side
  if (x >= 2 && x <= 14 && y >= 26 && y <= 38)
    return { id: 'ACTION HALL', label: '💥  ACTION HALL  · Fight & Shoot' }
  // FIGHTER WING — platformer / fighting
  if (x >= 6 && x <= 12 && y >= 38 && y <= 42)
    return { id: 'FIGHTER WING', label: '🥊  FIGHTER WING  · Platform & Battle' }
  if (x >= 2 && x <= 20 && y >= 40 && y <= 52)
    return { id: 'FIGHTER WING', label: '🥊  FIGHTER WING  · Platform & Battle' }
  return { id: 'THE OUTLET', label: 'THE OUTLET' }
}

// ── Store geometry ────────────────────────────────────────────
// dir:'v' = cells along y axis (constant x wall face)
// dir:'h' = cells along x axis (constant y wall face)
// ax,ay = first (lowest index) cell of store face
// size  = number of cells across the full facade
export const STORE_GEOMETRY = {
  // RACING / SPORTS HALL — north wall y=1
  infinitysoccer: { ax:2,  ay:1, dir:'h', size:4 },
  axieball:       { ax:6,  ay:1, dir:'h', size:4 },
  tinydrift:      { ax:10, ay:1, dir:'h', size:4 },
  lunaciacup:     { ax:14, ay:1, dir:'h', size:4 },
  // ACTION HALL — west wall x=1
  skysmash:       { ax:1, ay:26, dir:'v', size:4 },
  axiewar:        { ax:1, ay:30, dir:'v', size:4 },
  tacticards:     { ax:1, ay:34, dir:'v', size:4 },
  // FIGHTER WING — west wall x=1
  trifields:      { ax:1, ay:41, dir:'v', size:4 },
  acrosslunacia:  { ax:1, ay:45, dir:'v', size:4 },
  // PUZZLE HALL — north wall y=7, west wall x=21
  axiequest:    { ax:22, ay:7,  dir:'h', size:4 },
  puzzlechamps: { ax:26, ay:7,  dir:'h', size:4 },
  culinarywars: { ax:30, ay:7,  dir:'h', size:4 },
  triforce:     { ax:21, ay:8,  dir:'v', size:4 },
  denofmyst:    { ax:21, ay:12, dir:'v', size:4 },
  // STRATEGY HALL — north wall y=5
  kaidro:       { ax:38, ay:5, dir:'h', size:4 },
  machines:     { ax:42, ay:5, dir:'h', size:4 },
  wildforest:   { ax:46, ay:5, dir:'h', size:4 },
  // AXIE FRANCHISE — north wall y=1
  axie:         { ax:51, ay:1, dir:'h', size:4 },
  atia:         { ax:55, ay:1, dir:'h', size:4 },
  // SIMULATION HALL — east wall x=59, south wall y=31
  pixels:       { ax:59, ay:23, dir:'v', size:4 },
  lumiterra:    { ax:59, ay:27, dir:'v', size:4 },
  craftworld:   { ax:55, ay:31, dir:'h', size:4 },
  // ADVENTURE HALL — west wall x=39, east wall x=59
  apeiron:          { ax:39, ay:40, dir:'v', size:4 },
  lastodyssey:      { ax:39, ay:44, dir:'v', size:4 },
  ragnarokgenesis:  { ax:39, ay:48, dir:'v', size:4 },
  ragnarokamerica:  { ax:59, ay:40, dir:'v', size:4 },
  thebeacon:        { ax:59, ay:44, dir:'v', size:4 },
  // RPG HALL — north y=41, west x=19, south y=55
  aquariumquest:    { ax:21, ay:41, dir:'h', size:4 },
  calamity:         { ax:31, ay:41, dir:'h', size:4 },
  fishingfrenzy:    { ax:19, ay:43, dir:'v', size:4 },
  partyicons:       { ax:19, ay:47, dir:'v', size:4 },
  fableborne:       { ax:21, ay:55, dir:'h', size:4 },
  // TUTORIAL LOBBY — west wall x=61, south wall y=57
  tutorial_overview: { ax:61, ay:23, dir:'v', size:4 },
  tutorial_trading:  { ax:61, ay:27, dir:'v', size:4 },
  tutorial_dm:       { ax:61, ay:31, dir:'v', size:4 },
  tutorial_group:    { ax:61, ay:35, dir:'v', size:4 },
  tutorial_guild:    { ax:61, ay:39, dir:'v', size:4 },
  chickensaga:       { ax:63, ay:57, dir:'h', size:4 },
  grandarena:        { ax:67, ay:57, dir:'h', size:4 },
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
  'DISCOVERY WING': '#3f8efc',
  'COMMUNITY WING': '#ff5d8f',
  'WEST PASSAGE':   '#29b6f6',
  'TUTORIAL WING':  '#00e5ff',
}

// ── Zone-entry splash data ─────────────────────────────────────
// 5s banner shown when the player walks into a hall. Re-shows after a 2h
// per-zone cooldown (re-announces after long hangouts). Deliberately absent:
// LOBBY (spawn — has the one-time welcome splash), TUTORIAL WING (bespoke
// splash), THE OUTLET (catch-all), FUTURE.
export const ZONE_SPLASH = {
  'MAIN HALL':      { title: 'MAIN HALL',         sub: 'Pixels · Lumiterra' },
  'FOOD COURT':     { title: 'FOOD COURT',        sub: 'Wild Forest · meet & trade' },
  'AXIE LOBBY':     { title: 'AXIE INFINITY',     sub: "Origins · Atia's Legacy · Greenlight arcade" },
  'AXIE HALL':      { title: 'AXIE HALL',         sub: "Origins · Atia's Legacy" },
  'AXIE ARCADE':    { title: 'RACING & ARCADE',   sub: 'Axie Greenlight' },
  'AXIE PUZZLE':    { title: 'PUZZLE & IDLE',     sub: 'Axie Greenlight · Den of Mysteries' },
  'AXIE ACTION':    { title: 'ACTION & STRATEGY', sub: 'Axie Greenlight' },
  'RPG WING':       { title: 'RPG WING',          sub: 'Apeiron · Last Odyssey' },
  'STRATEGY WING':  { title: 'STRATEGY WING',     sub: 'Kaidro · The Machines Arena' },
  'EAST LOBBY':     { title: 'EAST LOBBY',        sub: 'Gateway to the Community Wing' },
  'DISCOVERY WING': { title: 'DISCOVERY WING',    sub: 'Ragnarok Landverse · Aquarium Quest · The Beacon' },
  'COMMUNITY WING': { title: 'COMMUNITY WING',    sub: 'PARTY ICONS · Calamity · Fableborne' },
  'WEST PASSAGE':   { title: 'WEST PASSAGE',      sub: 'Fishing Frenzy · Craft World · Chicken Saga · Grand Arena' },
}
