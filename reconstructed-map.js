// ═══════════════════════════════════════════════════════════════
// map.js — The Outlet tile map + store data
// 0 = floor, 1 = wall, 10–48 = storefront facade cells (see CELL)
// ═══════════════════════════════════════════════════════════════

// ── Cell ID constants ─────────────────────────────────────────
export const CELL = {
  FLOOR: 0,
  WALL:  1,
  PLANTER: 2,
  WATER:   3,
  AX: 10, WF: 11, AP: 12, LO: 13,
  KD: 14, MA: 15, PX: 16, LT: 17,
  TL: 32,
  IS: 18, TD: 19, LC: 20, AB: 21,
  AQ: 22, PC: 23, CW: 24, TF: 25, DM: 26,
  SS: 27, AI: 28, TR: 29, AL: 30, TA: 31,
  TU1: 33, TU2: 34, TU3: 35, TU4: 36, TU5: 37,
  RG: 38, RA: 39, AQ2: 40, BC: 41, PI: 42, CL: 43, FB: 44, FF: 45, CRW: 46, CS: 47, GA: 48,
}

// ═══════════════════════════════════════════════════════════════
// MALL LAYOUT v6
// ═══════════════════════════════════════════════════════════════

const GRID = 4    // tiles per sketch square
const MAXY = 23   // full sketch Y ruler
const PAD  = 2    // border of untouched wall around the whole layout

const tx = sx => PAD + sx * GRID
const ty = sy => PAD + (MAXY - sy) * GRID

function sketchBox(x0, x1, y0, y1) {
  return { x0: tx(x0), x1: tx(x1) + GRID - 1, y0: ty(y1), y1: ty(y0) + GRID - 1 }
}

export const ROOMS = [
  { id: 'RACING',              label: 'RACING',                    sketch: [13, 16, 16, 18], stores: ['tinydrift', 'lunaciacup'] },
  { id: 'SPORTS_HALL',         label: 'SPORTS HALL',               sketch: [10, 13, 16, 17], stores: ['infinitysoccer', 'axieball', 'grandarena'] },
  { id: 'FOOD_COURT',          label: 'FOOD COURT',                sketch: [7, 10, 13, 17],  stores: ['culinarywars'] },
  { id: 'ACTION_HALL',         label: 'ACTION HALL',               sketch: [4, 7, 16, 17],   stores: ['thebeacon', 'calamity', 'partyicons'] },
  { id: 'PLATFORMER_FIGHTING', label: 'PLATFORMER / FIGHTING',     sketch: [0, 4, 16, 18],   stores: ['acrosslunacia', 'kaidro', 'chickensaga'] },
  { id: 'PUZZLES',             label: 'PUZZLES',                   sketch: [10, 12, 9, 12],  stores: ['axiequest', 'puzzlechamps', 'triforce'] },
  { id: 'STRATEGY_HALL',       label: 'STRATEGY HALL',             sketch: [13, 14, 5, 10],  stores: ['wildforest', 'lastodyssey', 'trifields', 'tacticards', 'fableborne'] },
  { id: 'STRATEGY_HALL',       label: 'STRATEGY HALL',             sketch: [12, 14, 9, 10],  stores: [] },
  { id: 'MAIN_HALL',           label: 'MAIN HALL',                 sketch: [8, 9, 8, 13],    stores: [] },
  { id: 'AXIE_FRANCHISE',      label: 'AXIE INFINITY FRANCHISE',   sketch: [13, 16, 3, 7],   stores: ['axie', 'atia'] },
  { id: 'SIMULATION_HALL',     label: 'SIMULATION HALL',           sketch: [11, 13, 5, 6],   stores: ['pixels', 'aquariumquest', 'fishingfrenzy', 'craftworld'] },
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

export const DOORS = [
  { a: 'RACING',         b: 'SPORTS_HALL',     sketch: [13, 13, 16, 17] },
  { a: 'SPORTS_HALL',    b: 'FOOD_COURT',      sketch: [10, 10, 16, 17] },
  { a: 'FOOD_COURT',     b: 'ACTION_HALL',     sketch: [7,  7,  16, 17] },
  { a: 'FOOD_COURT',     b: 'MAIN_HALL',       sketch: [8,  9,  13, 13] },
  { a: 'ACTION_HALL',    b: 'PLATFORMER_FIGHTING', sketch: [4, 4, 16, 17] },
  { a: 'PUZZLES',        b: 'STRATEGY_HALL',   sketch: [12, 12, 9,  10] },
  { a: 'STRATEGY_HALL',  b: 'SIMULATION_HALL', sketch: [13, 13, 5,  6] },
  { a: 'MAIN_HALL',      b: 'MAIN_LOBBY',      sketch: [8,  9,  8,  8] },
  { a: 'SIMULATION_HALL',b: 'MAIN_LOBBY',      sketch: [11, 11, 5,  6] },
  { a: 'TUTORIAL',       b: 'TUTORIAL_LOBBY',  sketch: [9,  10, 4,  4] },
  { a: 'TUTORIAL',       b: 'MAIN_LOBBY',      sketch: [9,  10, 5,  5] },
  { a: 'MAIN_LOBBY',     b: 'ADVENTURE_HALL',  sketch: [8,  8,  5,  6] },
  { a: 'ADVENTURE_HALL', b: 'SHOOTER_HALL',    sketch: [4,  4,  5,  6] },
  { a: 'ROLE_PLAYING',   b: 'SHOOTER_HALL',    sketch: [3,  4,  9,  9] },
  { a: 'AXIE_FRANCHISE', b: 'STRATEGY_HALL',   sketch: [14, 14, 6,  7] },
  { a: 'AXIE_FRANCHISE', b: 'SIMULATION_HALL', sketch: [13, 13, 5,  6] },
  { a: 'PUZZLES',        b: 'STRATEGY_HALL',   sketch: [13, 13, 9,  10] },
]

for (const door of DOORS) {
  const [x0, x1, y0, y1] = door.sketch
  door.box = sketchBox(x0, x1, y0, y1)
}

const _maxX1 = Math.max(...ROOMS.map(r => r.box.x1))
const _maxY1 = Math.max(...ROOMS.map(r => r.box.y1))
export const MAP_W = _maxX1 + 1 + PAD
export const MAP_H = _maxY1 + 1 + PAD

// ── Build the map grid ────────────────────────────────────────
export const MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(CELL.WALL))

function carve(x1, y1, x2, y2) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) MAP[y][x] = CELL.FLOOR
}

for (const room of ROOMS) carve(room.box.x0, room.box.y0, room.box.x1, room.box.y1)

// ── Wall-restoration pass ──────────────────────────────────────
function findDoor(idA, idB) {
  return DOORS.find(d => (d.a === idA && d.b === idB) || (d.a === idB && d.b === idA))
}

const span = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) + 1

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
    if (A.id === B.id) continue

    const ox = span(A.box.x0, A.box.x1, B.box.x0, B.box.x1)
    const oy = span(A.box.y0, A.box.y1, B.box.y0, B.box.y1)
    const touchX = ox === 0 && oy > 0
    const touchY = oy === 0 && ox > 0
    const overlap = ox > 0 && oy > 0
    if (!touchX && !touchY && !overlap) continue

    const door = findDoor(A.id, B.id)

    if (overlap) {
      const x0 = Math.max(A.box.x0, B.box.x0), x1 = Math.min(A.box.x1, B.box.x1)
      const y0 = Math.max(A.box.y0, B.box.y0), y1 = Math.min(A.box.y1, B.box.y1)
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const inDoor = door && x >= door.box.x0 && x <= door.box.x1 && y >= door.box.y0 && y <= door.box.y1
          if (!inDoor && !protectedCell[y][x]) MAP[y][x] = CELL.WALL
        }
      }
    } else if (touchX) {
      const left = A.box.x1 < B.box.x0 ? A : B
      const right = left === A ? B : A
      const y0 = Math.max(A.box.y0, B.box.y0), y1 = Math.min(A.box.y1, B.box.y1)
      const doorHere = door && door.box.x0 <= right.box.x0 && right.box.x0 <= door.box.x1
      for (let y = y0; y <= y1; y++) {
        const inDoor = doorHere && y >= door.box.y0 && y <= door.box.y1
        if (!inDoor && !protectedCell[y][right.box.x0]) MAP[y][right.box.x0] = CELL.WALL
      }
    } else {
      const top = A.box.y1 < B.box.y0 ? A : B
      const bottom = top === A ? B : A
      const x0 = Math.max(A.box.x0, B.box.x0), x1 = Math.min(A.box.x1, B.box.x1)
      const doorHere = door && door.box.y0 <= bottom.box.y0 && bottom.box.y0 <= door.box.y1
      for (let x = x0; x <= x1; x++) {
        const inDoor = doorHere && x >= door.box.x0 && x <= door.box.x1
        if (!inDoor && !protectedCell[bottom.box.y0][x]) MAP[bottom.box.y0][x] = CELL.WALL
      }
    }
  }
}

// ── Spawn point ───────────────────────────────────────────────
const _lobbyBox = ROOMS.find(r => r.id === 'MAIN_LOBBY').box
export const SPAWN = {
  x: (_lobbyBox.x0 + _lobbyBox.x1) / 2,
  y: (_lobbyBox.y0 + _lobbyBox.y1) / 2,
}
