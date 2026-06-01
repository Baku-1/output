// ═══════════════════════════════════════════════════════════════
// avatarCache.js — NFT avatar texture cache (IndexedDB)
// The Outlet — WebZone 001
//
// Bakes any NFT image (humanoid or not) into a 64×64 RGBA
// Uint8Array for use as a raycaster sprite texture.
//
// Baking pipeline:
//   Load image → contain-fit onto 64×64 transparent canvas
//   → strip solid backgrounds → Uint8Array → store in IndexedDB
//
// Public API:
//   avatarCache.init()                  → Promise<void>
//   avatarCache.get(address)            → Promise<Uint8Array|null>
//   avatarCache.set(address, imgEl)     → Promise<Uint8Array>
//   loadPlayerAvatar(address, cb)       → void  (async, cb(tex))
// ═══════════════════════════════════════════════════════════════

import { IDB_DB_NAME, IDB_DB_VERSION, IDB_STORE_NAME, AVATAR_TEX_SIZE, AVATAR_CACHE_TTL } from './config.js'
import { loadNFTImage } from './nftService.js'

// ── IndexedDB wrapper ─────────────────────────────────────────
let _db = null

export const avatarCache = {
  async init() {
    if (_db) return
    _db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION)
      req.onupgradeneeded = e => {
        const db = e.target.result
        if (db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.deleteObjectStore(IDB_STORE_NAME)
        }
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'address' })
      }
      req.onsuccess = e => resolve(e.target.result)
      req.onerror   = e => reject(e.target.error)
    })
  },

  async get(address) {
    if (!_db) return null
    return new Promise(resolve => {
      const tx  = _db.transaction(IDB_STORE_NAME, 'readonly')
      const req = tx.objectStore(IDB_STORE_NAME).get(address)
      req.onsuccess = e => {
        const rec = e.target.result
        if (!rec) return resolve(null)
        // Evict stale entries
        if (Date.now() - rec.ts > AVATAR_CACHE_TTL) return resolve(null)
        resolve(new Uint8Array(rec.data))
      }
      req.onerror = () => resolve(null)
    })
  },

  async set(address, imgEl) {
    const tex = _bake(imgEl)
    if (!_db) return tex
    return new Promise(resolve => {
      const tx  = _db.transaction(IDB_STORE_NAME, 'readwrite')
      const req = tx.objectStore(IDB_STORE_NAME).put({
        address,
        data: tex.buffer,
        ts:   Date.now(),
      })
      req.onsuccess = () => resolve(tex)
      req.onerror   = () => resolve(tex)   // cache failure is non-fatal
    })
  },

  async clear(address) {
    if (!_db) return
    const tx = _db.transaction(IDB_STORE_NAME, 'readwrite')
    tx.objectStore(IDB_STORE_NAME).delete(address)
  },
}

// ── Bake an HTMLImageElement into a 64×64 RGBA Uint8Array ────
// Uses contain-fit so no NFT image is distorted.
// Background is kept transparent so the raycaster world shows through.
function _bake(imgEl) {
  const S  = AVATAR_TEX_SIZE   // 64
  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c  = oc.getContext('2d')

  if (imgEl && imgEl.naturalWidth > 0) {
    const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight
    const scale = Math.min(S / iw, S / ih)
    const dw = iw * scale, dh = ih * scale
    const dx = (S - dw) / 2, dy = (S - dh) / 2
    c.drawImage(imgEl, dx, dy, dw, dh)
  }

  const data = c.getImageData(0, 0, S, S).data

  if (_hasMeaningfulAlpha(data)) {
    _peelBorderConnected(data, S, _isNearBlack)
    _peelBorderConnected(data, S, _isNearWhite)
  } else {
    _removeBackground(data, S)
  }

  return new Uint8Array(_cropToOpaque(data, S).buffer)
}

function _hasMeaningfulAlpha(data) {
  let transparent = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 240) transparent++
    if (transparent > 64) return true
  }
  return false
}

function _isNearBlack(r, g, b) {
  return r < 55 && g < 55 && b < 55
}

function _isNearWhite(r, g, b) {
  return r > 215 && g > 215 && b > 215
}

function _isDarkBg(r, g, b) {
  // Fast luma-ish check: 0..(255*8). Threshold tuned for "studio black" gradients.
  return (r * 3 + g * 4 + b) < 340
}

function _isLightBg(r, g, b) {
  return (r * 3 + g * 4 + b) > 1900
}

// ── Background removal — BFS flood fill from corners ─────────
// Marks background pixels (transparent or colour-matched from corners)
// as alpha=0 so the raycaster world shows through the character silhouette.
// Tolerance of 40 (Manhattan RGB distance) handles white/off-white/dark bgs.
function _removeBackground(data, S) {
  const TOL = 85
  const bgColors = _borderBgColors(data, S, 2)

  for (const [bgR, bgG, bgB] of bgColors) {
    const colorMatch = (r, g, b) =>
      Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) <= TOL
    _peelBorderConnected(data, S, colorMatch)
  }

  // Axie / studio renders often ship with pure black or white letterboxing
  _peelBorderConnected(data, S, _isNearBlack)
  _peelBorderConnected(data, S, _isNearWhite)
  // And sometimes gradients: strip any border-connected dark/light background.
  _peelBorderConnected(data, S, _isDarkBg)
  _peelBorderConnected(data, S, _isLightBg)
}

function _borderBgColors(data, S, count) {
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

// BFS from the image border; strip pixels matching predicate (alpha → 0).
// Re-bake opaque pixels into a tight 64×64 frame (drops leftover letterbox).
function _cropToOpaque(data, S) {
  let minX = S, minY = S, maxX = -1, maxY = -1
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 20) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return data

  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const sub = new Uint8ClampedArray(bw * bh * 4)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((minY + y) * S + (minX + x)) * 4
      const di = (y * bw + x) * 4
      sub[di] = data[si]; sub[di + 1] = data[si + 1]
      sub[di + 2] = data[si + 2]; sub[di + 3] = data[si + 3]
    }
  }

  const tmp = document.createElement('canvas')
  tmp.width = bw; tmp.height = bh
  tmp.getContext('2d').putImageData(new ImageData(sub, bw, bh), 0, 0)

  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c = oc.getContext('2d')
  const pad = 2
  const scale = Math.min((S - pad * 2) / bw, (S - pad * 2) / bh)
  const dw = bw * scale, dh = bh * scale
  c.drawImage(tmp, (S - dw) / 2, (S - dh) / 2, dw, dh)
  return c.getImageData(0, 0, S, S).data
}

function _peelBorderConnected(data, S, predicate) {
  const visited = new Uint8Array(S * S)
  const qx = new Int16Array(S * S)
  const qy = new Int16Array(S * S)
  let head = 0, tail = 0

  const enqueue = (x, y) => {
    if (x < 0 || x >= S || y < 0 || y >= S) return
    if (visited[y * S + x]) return
    visited[y * S + x] = 1
    qx[tail] = x; qy[tail] = y; tail++
  }

  for (let x = 0; x < S; x++) { enqueue(x, 0); enqueue(x, S - 1) }
  for (let y = 1; y < S - 1; y++) { enqueue(0, y); enqueue(S - 1, y) }

  while (head < tail) {
    const x = qx[head], y = qy[head]; head++
    const i = (y * S + x) * 4
    const a = data[i + 3]
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (a === 0 || predicate(r, g, b)) {
      data[i + 3] = 0
      enqueue(x + 1, y); enqueue(x - 1, y)
      enqueue(x, y + 1); enqueue(x, y - 1)
    }
  }
}

// ── Procedural fallback avatar ────────────────────────────────
// Generates a coloured silhouette from the wallet address hash.
// Used when no NFT is selected or image fails to load.
export function makeProceduralAvatar(address) {
  const S  = AVATAR_TEX_SIZE
  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c  = oc.getContext('2d')

  // Hash address to hue
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360

  // Head
  c.fillStyle = `hsl(${hue},70%,60%)`
  c.beginPath(); c.ellipse(S/2, S*0.25, S*0.15, S*0.15, 0, 0, Math.PI*2); c.fill()
  // Body
  c.fillRect(S*0.3, S*0.38, S*0.4, S*0.32)
  // Band accent
  c.fillStyle = `hsl(${(hue+40)%360},80%,65%)`
  c.fillRect(S*0.3, S*0.46, S*0.4, S*0.06)

  return new Uint8Array(c.getImageData(0, 0, S, S).data.buffer)
}

// ── High-level loader ─────────────────────────────────────────
// Checks cache first, then fetches the image URL stored in
// sessionStorage (set by avatarPicker on selection).
// Calls cb(texture) when ready.
export async function loadPlayerAvatar(address, cb, imageUrl = null) {
  // 1. IndexedDB cache — local player only (remote URL may differ from cached bake)
  if (!imageUrl) {
    const cached = await avatarCache.get(address)
    if (cached) return cb(cached)
  }

  // 2. Image URL: explicit (remote broadcast) or local sessionStorage (picker)
  const storedUrl = imageUrl ?? sessionStorage.getItem(`avatar-url:${address}`)
  if (storedUrl) {
    const img = await loadNFTImage(storedUrl, _nftHintFromUrl(storedUrl))
    if (!img) return cb(makeProceduralAvatar(address))
    const tex = await avatarCache.set(address, img)
    return cb(tex)
  }

  // 3. Procedural fallback
  cb(makeProceduralAvatar(address))
}

function _nftHintFromUrl(url) {
  const m = url.match(/axies\/(\d+)\//i)
  if (!m) return null
  return { tokenId: m[1], imageUrl: url, contractAddress: '', collectionName: 'Axie' }
}
