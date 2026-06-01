// ═══════════════════════════════════════════════════════════════
// avatarCache.js — NFT avatar texture cache (IndexedDB)
// The Outlet — WebZone 001
//
// Bakes any NFT image (humanoid or not) into a 64×64 RGBA
// Uint8Array for use as a raycaster sprite texture.
//
// Baking pipeline:
//   Load image → draw contain-fit onto 64×64 canvas with dark bg
//   → getImageData → Uint8Array → store in IndexedDB
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
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'address' })
        }
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
// Dark background ensures any shape (creature, item, etc.) reads
// clearly as a sprite at any distance in the raycaster.
function _bake(imgEl) {
  const S  = AVATAR_TEX_SIZE   // 64
  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c  = oc.getContext('2d')

  // Dark background — consistent backdrop for all NFT shapes
  c.fillStyle = '#0a0a14'
  c.fillRect(0, 0, S, S)

  if (imgEl && imgEl.naturalWidth > 0) {
    const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight
    const scale = Math.min(S / iw, S / ih) * 0.9  // 90% fill, slight margin
    const dw = iw * scale, dh = ih * scale
    const dx = (S - dw) / 2, dy = (S - dh) / 2

    // Slight brightness boost so dark NFTs read at distance
    c.filter = 'brightness(1.15)'
    c.drawImage(imgEl, dx, dy, dw, dh)
    c.filter = 'none'
  }

  return new Uint8Array(c.getImageData(0, 0, S, S).data.buffer)
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

  c.fillStyle = '#0a0a14'
  c.fillRect(0, 0, S, S)

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
export async function loadPlayerAvatar(address, cb) {
  // 1. Try IndexedDB cache
  const cached = await avatarCache.get(address)
  if (cached) return cb(cached)

  // 2. Try stored image URL (set by avatarPicker)
  const storedUrl = sessionStorage.getItem(`avatar-url:${address}`)
  if (storedUrl) {
    const img = await loadNFTImage(storedUrl)
    const tex = await avatarCache.set(address, img)
    return cb(tex)
  }

  // 3. Procedural fallback
  cb(makeProceduralAvatar(address))
}
