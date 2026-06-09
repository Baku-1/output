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
//   getAxieGenes(tokenId)               → Promise<string|null>
// ═══════════════════════════════════════════════════════════════

import { IDB_DB_NAME, IDB_DB_VERSION, IDB_STORE_NAME, AVATAR_TEX_SIZE, AVATAR_CACHE_TTL } from './config.js'
import { loadNFTImage, loadImageUrl, isAxieAvatarUrl, axieImageCandidates } from './nftService.js'
import { SpineAvatarInstance, AXIE_CONTRACT } from './spineAvatar.js'
import { GenericSpineAvatarInstance } from './genericSpineAvatar.js'

// ── Sky Mavis GraphQL — fetch Axie genes by tokenId ─────────────
// Returns the genes hex string, or null if unavailable.
// Requires VITE_SKY_MAVIS_API_KEY in .env; skips silently if missing.
export async function getAxieGenes(tokenId) {
  try {
    // The API key is NOT sent from the browser — it lives in Vercel's server-side
    // environment as SKY_MAVIS_API_KEY (no VITE_ prefix) and is added by the Edge
    // Function, keeping it out of the client bundle entirely.
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'GetAxieDetail',
        variables: { axieId: String(tokenId) },
        query: 'query GetAxieDetail($axieId: ID!) { axie(axieId: $axieId) { id newGenes genes } }',
      }),
    })
    if (!res.ok) {
      console.warn('[avatarCache] getAxieGenes: HTTP', res.status, await res.text().catch(() => ''))
      return null
    }
    const json = await res.json()
    if (json?.errors) {
      console.warn('[avatarCache] getAxieGenes GraphQL errors:', JSON.stringify(json.errors))
    }
    // Prefer 512-bit newGenes; fall back to 256-bit genes if newGenes is absent
    return json?.data?.axie?.newGenes ?? json?.data?.axie?.genes ?? null
  } catch (e) {
    console.warn('[avatarCache] getAxieGenes failed:', e)
    return null
  }
}

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

  async set(address, imgEl, isAxie = false) {
    const tex = _bake(imgEl, isAxie)
    if (!tex) return null   // CORS-tainted — don't cache
    return avatarCache.putTex(address, tex)
  },

  async putTex(address, tex) {
    if (!_db) return tex
    return new Promise(resolve => {
      const tx  = _db.transaction(IDB_STORE_NAME, 'readwrite')
      const req = tx.objectStore(IDB_STORE_NAME).put({
        address,
        data: tex.buffer,
        ts:   Date.now(),
      })
      req.onsuccess = () => resolve(tex)
      req.onerror   = () => resolve(tex)
    })
  },

  async clear(address) {
    if (!_db) return
    return new Promise(resolve => {
      const tx  = _db.transaction(IDB_STORE_NAME, 'readwrite')
      const req = tx.objectStore(IDB_STORE_NAME).delete(address)
      req.onsuccess = () => resolve()
      req.onerror   = () => resolve()   // resolve anyway — best-effort clear
    })
  },
}

// ── Bake an HTMLImageElement into a 64×64 RGBA Uint8Array ────
// Uses contain-fit so no NFT image is distorted.
// Background is kept transparent so the raycaster world shows through.
function _bake(imgEl, isAxie = false) {
  const S  = AVATAR_TEX_SIZE   // 64
  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c  = oc.getContext('2d')

  if (imgEl && imgEl.naturalWidth > 0) {
    const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight
    const inset = isAxie ? 0.86 : 1
    const scale = Math.min(S / iw, S / ih) * inset
    const dw = iw * scale, dh = ih * scale
    const dx = (S - dw) / 2, dy = (S - dh) / 2
    c.drawImage(imgEl, dx, dy, dw, dh)
  }

  // getImageData fails on tainted canvases (image loaded without CORS headers).
  // Return null so callers know NOT to cache this result in IDB — caching a
  // tainted bake would permanently store a broken texture for this player.
  // Callers should fall back to makeProceduralAvatar for a consistent result.
  // Long-term fix: configure CORS headers on the CDN origin.
  let imgData
  try {
    imgData = c.getImageData(0, 0, S, S)
  } catch (e) {
    console.warn('[avatarCache] Tainted canvas — CORS blocked, skipping cache')
    return null
  }
  const data = imgData.data

  if (isAxie) {
    _removeAxieBackground(data, S)
  } else if (_hasMeaningfulAlpha(data)) {
    _peelBorderConnected(data, S, _isNearBlack)
    _peelBorderConnected(data, S, _isNearWhite)
  } else {
    _removeBackground(data, S, false)
  }

  return new Uint8Array(_cropToOpaque(data, S).buffer)
}

function _axieFaceScore(tex, S = AVATAR_TEX_SIZE) {
  let n = 0
  const cx = S / 2, cy = S * 0.32
  const rx = S * 0.24, ry = S * 0.2
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry
      if (dx * dx + dy * dy > 1) continue
      if (tex[(y * S + x) * 4 + 3] > 100) n++
    }
  }
  return n
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

// ── Axie-only background strip ─────────────────────────────────
// Shallow border peel only (never floods through dark mask/face parts).
// Aggressive dark-luma peeling was eating Mask-trait faces.
function _removeAxieBackground(data, S) {
  const bgColors = _borderBgColors(data, S, 1)
  const TOL = 50
  const MAX_DEPTH = 14

  for (const [bgR, bgG, bgB] of bgColors) {
    const colorMatch = (r, g, b) =>
      Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) <= TOL
    _peelBorderConnected(data, S, colorMatch, MAX_DEPTH)
  }
  _peelBorderConnected(data, S, (r, g, b) => r < 20 && g < 20 && b < 20, 10)
}

// ── Background removal — BFS flood fill from corners ─────────
// TOL: Manhattan-distance tolerance across R+G+B channels.
// 40 ≈ ~13 per channel — catches near-uniform backgrounds without
// eating light fur / accessories / thin limbs (was 85, too aggressive).
// MAX_BG_DEPTH: limits BFS to a shallow border strip so it can't
// tunnel through a connected path all the way into the character.
function _removeBackground(data, S, isAxie = false) {
  const TOL          = 55   // raised from 40: catches tan/beige/off-white backgrounds
  const MAX_BG_DEPTH = 10   // pixels inward the BFS may travel
  const bgColors     = _borderBgColors(data, S, 3)  // sample top 3 border colors

  for (const [bgR, bgG, bgB] of bgColors) {
    const colorMatch = (r, g, b) =>
      Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) <= TOL
    _peelBorderConnected(data, S, colorMatch, MAX_BG_DEPTH)

    // Only peel near-white pixels if the detected background IS near-white,
    // and only near-black pixels if the background IS near-black.
    // Previously these ran unconditionally, eating white fur / dark outlines
    // on characters whose edge pixels happened to match.
    if (_isNearWhite(bgR, bgG, bgB)) {
      _peelBorderConnected(data, S, _isNearWhite, MAX_BG_DEPTH)
    }
    if (_isNearBlack(bgR, bgG, bgB)) {
      _peelBorderConnected(data, S, _isNearBlack, MAX_BG_DEPTH)
    }
  }
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

function _peelBorderConnected(data, S, predicate, maxDepth = 255) {
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

// ── Procedural fallback avatar ────────────────────────────────
export function makeProceduralAvatar(address) {
  const S  = AVATAR_TEX_SIZE
  const oc = document.createElement('canvas')
  oc.width = oc.height = S
  const c  = oc.getContext('2d')

  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360

  c.fillStyle = `hsl(${hue},70%,60%)`
  c.beginPath(); c.ellipse(S/2, S*0.25, S*0.15, S*0.15, 0, 0, Math.PI*2); c.fill()
  c.fillRect(S*0.3, S*0.38, S*0.4, S*0.32)
  c.fillStyle = `hsl(${(hue+40)%360},80%,65%)`
  c.fillRect(S*0.3, S*0.46, S*0.4, S*0.06)

  return new Uint8Array(c.getImageData(0, 0, S, S).data.buffer)
}

// ── High-level loader ─────────────────────────────────────────
// Checks cache first, then fetches the image URL stored in
// sessionStorage (set by avatarPicker on selection).
// Calls cb(texture) when ready — texture is either:
//   • Uint8Array (64×64) — static BFS-baked NFT or procedural
//   • SpineAvatarInstance (128×128) — live animated Axie
//
// @param {string}      address   — wallet address (cache key)
// @param {function}    cb        — callback(tex)
// @param {string|null} imageUrl  — explicit URL (remote broadcast path)
// @param {object|null} nft       — { contractAddress, tokenId } if available
export async function loadPlayerAvatar(address, cb, imageUrl = null, nft = null) {
  // 1. IndexedDB cache — local player only (remote URL may differ from cached bake)
  if (!imageUrl) {
    const cached = await avatarCache.get(address)
    if (cached) return cb(cached)
  }

  // 2. Image URL: explicit (remote broadcast) or local sessionStorage (picker)
  const storedUrl = imageUrl ?? sessionStorage.getItem(`avatar-url:${address}`)
  if (storedUrl) {
    const isAxie = (nft?.contractAddress?.toLowerCase() === AXIE_CONTRACT) ||
      isAxieAvatarUrl(storedUrl) ||
      sessionStorage.getItem(`avatar-is-axie:${address}`) === '1'
    const hint = _nftHintFromUrl(storedUrl)

    if (isAxie) {
      // ── Spine path: try Ghost Canvas Render if API key + tokenId available ──
      const tokenId = nft?.tokenId ?? hint?.tokenId ?? null
      // API key is server-side only — no client check needed; edge function handles auth.
      if (tokenId) {
        const genes = await getAxieGenes(tokenId)
        if (genes) {
          const inst = new SpineAvatarInstance()
          await inst.init(genes)
          if (inst.isReady) {
            // Return the live SpineAvatarInstance — renderer detects via .pixelData
            return cb(inst)
          }
          // init() failed — fall through below
        }
      }

      // ── Classic pre-baked assets (assets.axieinfinity.com, no auth needed) ──
      // Covers: genes unavailable, API key absent, or mixer init failure.
      if (tokenId) {
        const classicInst = new SpineAvatarInstance()
        await classicInst.initFromClassicId(tokenId)
        if (classicInst.isReady) return cb(classicInst)
      }

      // ── 6-bone rig fallback (Spine unavailable or classic assets 404) ──
      const axieImg = await loadNFTImage(storedUrl, hint)
      if (axieImg) {
        const rigInst = new GenericSpineAvatarInstance()
        await rigInst.init(axieImg)
        if (rigInst.isReady) return cb(rigInst)
      }

      // ── Static bake last resort ──
      const tex = await _bakeBestAxie(hint, storedUrl)
      if (!tex) return cb(makeProceduralAvatar(address))
      await avatarCache.putTex(address, tex)
      return cb(tex)
    }

    // ── Non-Axie NFT: 6-bone GenericSpineAvatarInstance ─────────────────────
    const img = await loadNFTImage(storedUrl, hint)
    if (!img) return cb(makeProceduralAvatar(address))

    const inst = new GenericSpineAvatarInstance()
    await inst.init(img)
    if (inst.isReady) return cb(inst)

    // Spine init failed — fall back to static BFS bake
    const tex = await avatarCache.set(address, img, false)
    return cb(tex ?? makeProceduralAvatar(address))
  }

  // 3. Procedural fallback
  cb(makeProceduralAvatar(address))
}

function _nftHintFromUrl(url) {
  const m = url.match(/axies\/(\d+)\//i)
  if (!m) return null
  return { tokenId: m[1], imageUrl: url, contractAddress: '', collectionName: 'Axie' }
}

async function _bakeBestAxie(hint, storedUrl) {
  const urls = []
  if (storedUrl) urls.push(storedUrl)
  if (hint) {
    for (const u of axieImageCandidates(hint)) {
      if (u && !urls.includes(u)) urls.push(u)
    }
  }

  let bestTex = null, bestScore = -1
  for (const u of urls) {
    const img = await loadImageUrl(u)
    if (!img) continue
    const tex = _bake(img, true)
    if (!tex) continue   // CORS-tainted canvas — skip, don't cache
    const score = _axieFaceScore(tex)
    if (score > bestScore) { bestScore = score; bestTex = tex }
  }
  return bestTex
}
