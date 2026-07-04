// ═══════════════════════════════════════════════════════════════
// imageBgRemoval.js — shared border-connected BFS background peel
// Extracted (Phase 1.2) from the formerly duplicated implementations:
//   avatarCache._peelBorderConnected / _borderBgColors
//   genericSpineAvatar._peel / _borderBgColors
// Per-collection tolerance values live in config.js BG_TOLERANCE (Phase 1.3).
// ═══════════════════════════════════════════════════════════════

// Dominant border colours of an S×S RGBA buffer, as up to `count`
// [r,g,b] triples (5-bit histogram buckets, scaled back to 0-248).
export function borderBgColors(data, S, count) {
  const hist = new Uint16Array(32 * 32 * 32)
  const push = (x, y) => {
    const i = (y * S + x) * 4
    if (data[i + 3] <= 20) return
    const r = data[i] >> 3, g = data[i + 1] >> 3, b = data[i + 2] >> 3
    hist[(r << 10) | (g << 5) | b]++
  }

  for (let x = 0; x < S; x++) { push(x, 0); push(x, S - 1) }
  for (let y = 1; y < S - 1; y++) { push(0, y); push(S - 1, y) }

  const out = []
  const used = new Uint8Array(hist.length)
  for (let n = 0; n < count; n++) {
    let best = -1, bestN = 0
    for (let i = 0; i < hist.length; i++) {
      if (used[i]) continue
      const h = hist[i]
      if (h > bestN) { bestN = h; best = i }
    }
    if (bestN === 0) break
    used[best] = 1
    out.push([
      ((best >> 10) & 31) << 3,
      ((best >> 5) & 31) << 3,
      (best & 31) << 3,
    ])
  }
  return out
}

// BFS from the border, zeroing alpha on pixels matching `predicate`,
// travelling at most `maxDepth` pixels inward (depth cap stops the
// flood tunnelling through a connected path into the character).
export function peelBorderConnected(data, S, predicate, maxDepth = 255) {
  const visited = new Uint8Array(S * S)
  const depth   = new Uint8Array(S * S)
  depth.fill(255)
  const qx = new Int16Array(S * S)
  const qy = new Int16Array(S * S)
  let head = 0, tail = 0

  const enqueue = (x, y, d) => {
    if (x < 0 || x >= S || y < 0 || y >= S) return
    if (d > maxDepth || visited[y * S + x]) return
    visited[y * S + x] = 1
    depth[y * S + x] = d
    qx[tail] = x; qy[tail] = y; tail++
  }

  for (let x = 0; x < S; x++) { enqueue(x, 0, 0); enqueue(x, S - 1, 0) }
  for (let y = 1; y < S - 1; y++) { enqueue(0, y, 0); enqueue(S - 1, y, 0) }

  while (head < tail) {
    const x = qx[head], y = qy[head]; head++
    const d = depth[y * S + x]
    if (d > maxDepth) continue
    const i = (y * S + x) * 4
    const a = data[i + 3]
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (a === 0 || predicate(r, g, b)) {
      data[i + 3] = 0
      const nd = d + 1
      if (nd <= maxDepth) {
        enqueue(x + 1, y, nd); enqueue(x - 1, y, nd)
        enqueue(x, y + 1, nd); enqueue(x, y - 1, nd)
      }
    }
  }
}
