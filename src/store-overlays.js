// ═══════════════════════════════════════════════════════════════
// store-overlays.js — Per-column poster panel rendering
// The Outlet — WebZone 001
//
// Two rendering modes, both using the same ray-plane math:
//   CONTAIN — logo: full image letterboxed inside the wall height
//   COVER   — key art: fill the wall height, crop image sides
//
// Logo loads at startup (always visible on approach).
// Key art loads lazily on first proximity and draws on top.
// ═══════════════════════════════════════════════════════════════
import { STORES, STORE_GEOMETRY } from './map.js'
import { WALL_HEIGHT } from './config.js'

const _imgs  = {}   // storeId -> { left, right, logo }

const _load  = src => { const i = new Image(); i.src = src; return i }
const _ready = img => img && img.complete && img.naturalWidth > 0

// ── Load logos at startup; key art loads once on first approach ─
export function initStoreOverlays() {
  const loadArr = src => Array.isArray(src) ? src.map(_load) : (src ? [_load(src)] : null)
  for (const [storeId, store] of Object.entries(STORES)) {
    if (!store.assets) continue
    const { logo, poster_left, poster_right } = store.assets
    _imgs[storeId] = {
      left:  loadArr(poster_left),
      right: loadArr(poster_right),
      logo:  logo         ? _load(logo)         : null,
    }
  }
}

// ── Per-column ray renderer ───────────────────────────────────
// containMode = true  → full image letterboxed (logo)
// containMode = false → image cropped to fill panel height (key art)
// ── Project a world point to screen ──────────────────────────
function _proj(wx, wy, posX, posY, dirX, dirY, plX, plY, W, H) {
  const sx = wx - posX, sy = wy - posY
  const inv = 1.0 / (plX * dirY - dirX * plY)
  const tX  = inv * ( dirY * sx - dirX * sy)
  const tY  = inv * (-plY  * sx + plX  * sy)
  if (tY <= 0.1) return null
  return { screenX: (W / 2) * (1 + tX / tY), depth: tY }
}

// ── Update — called every frame ───────────────────────────────
// Logo:    all stores, simple rectangle projection, screen blend (removes black bg)
// Key art: nearby stores only, per-column for precise wall tracking
export function updateStoreOverlays(ctx, posX, posY, dirX, dirY, plX, plY, nearbyStores, W, H, t) {
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Logo pass — every store, always
  for (const storeId of Object.keys(_imgs)) {
    _renderLogo(ctx, storeId, posX, posY, dirX, dirY, plX, plY, W, H)
  }

  // Key art pass — nearby stores only, per-column
  if (nearbyStores) {
    for (const storeId of nearbyStores) {
      _renderKeyArt(ctx, storeId, posX, posY, dirX, dirY, plX, plY, W, H, t)
    }
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

// ── Logo: per-column ray casting + screen blend (black bg → transparent) ──
// Same wall-tracking math as key art, but CONTAIN (letterboxed) instead of cover-crop.
// Contain box is computed in normalized panel coords from the logo's aspect ratio
// vs the panel's world-space aspect ratio (panelWidth / 1 wall-unit).
function _renderLogo(ctx, storeId, posX, posY, dirX, dirY, plX, plY, W, H) {
  const geo  = STORE_GEOMETRY[storeId]
  const imgs = _imgs[storeId]
  if (!geo || !imgs || !_ready(imgs.logo)) return

  let xFace, yFace
  if (geo.dir === 'v') xFace = posX > geo.ax ? geo.ax + 1 : geo.ax
  else                  yFace = posY > geo.ay ? geo.ay + 1 : geo.ay

  const logo   = imgs.logo
  const logoAr = logo.naturalWidth / logo.naturalHeight

  const panels = [
    { lo: 0.00, hi: 0.32 },
    { lo: 0.68, hi: 1.00 },
  ]

  ctx.globalCompositeOperation = 'screen'

  for (const panel of panels) {
    const panelWorldW = geo.size * (panel.hi - panel.lo)
    // Panel aspect ratio in world space (wall height = 1 unit before WALL_HEIGHT multiplier)
    const panelAr = panelWorldW / 1

    // Contain box: normalized 0-1 coords within the panel
    let logoL, logoR, logoT, logoB
    if (logoAr > panelAr) {
      // Logo wider than panel → fills width, letterbox top/bottom
      logoL = 0; logoR = 1
      const h = panelAr / logoAr
      logoT = (1 - h) / 2; logoB = logoT + h
    } else {
      // Logo taller → fills height, letterbox left/right
      logoT = 0; logoB = 1
      const w = logoAr / panelAr
      logoL = (1 - w) / 2; logoR = logoL + w
    }

    const wStart = geo.dir === 'v'
      ? geo.ay + geo.size * panel.lo : geo.ax + geo.size * panel.lo
    const wEnd   = geo.dir === 'v'
      ? geo.ay + geo.size * panel.hi : geo.ax + geo.size * panel.hi

    for (let col = 0; col < W; col++) {
      const camX  = 2 * col / W - 1
      const rayDX = dirX + plX * camX
      const rayDY = dirY + plY * camX

      let hitCoord, pd
      if (geo.dir === 'v') {
        if (Math.abs(rayDX) < 1e-10) continue
        pd = (xFace - posX) / rayDX
        if (pd <= 0.05) continue
        hitCoord = posY + pd * rayDY
      } else {
        if (Math.abs(rayDY) < 1e-10) continue
        pd = (yFace - posY) / rayDY
        if (pd <= 0.05) continue
        hitCoord = posX + pd * rayDX
      }

      if (hitCoord < wStart || hitCoord > wEnd) continue

      let frac = (hitCoord - wStart) / (wEnd - wStart)
      if (geo.dir === 'v' && plY < 0) frac = 1 - frac
      if (geo.dir === 'h' && plX < 0) frac = 1 - frac

      // Skip columns outside the logo's horizontal letterbox band
      if (frac < logoL || frac > logoR) continue

      const srcX = Math.floor(((frac - logoL) / (logoR - logoL)) * logo.naturalWidth)
      if (srcX < 0 || srcX >= logo.naturalWidth) continue

      const wallH   = H * WALL_HEIGHT / pd
      const wallTop = H / 2 - wallH / 2

      // Vertical letterbox — draw only in the logo's vertical band
      const drawTop = Math.round(wallTop + wallH * logoT)
      const drawH   = Math.round(wallH * (logoB - logoT))
      if (drawH < 1) continue

      const fade = Math.max(0, Math.min(1, (14 - pd) / 10))
      if (fade <= 0) continue

      ctx.globalAlpha = fade
      ctx.drawImage(logo, srcX, 0, 1, logo.naturalHeight, col, drawTop, 1, drawH)
    }
  }

  ctx.globalCompositeOperation = 'source-over'
}

// ── Key art: per-column for pixel-perfect wall tracking ───────
function _renderKeyArt(ctx, storeId, posX, posY, dirX, dirY, plX, plY, W, H, t) {
  const geo  = STORE_GEOMETRY[storeId]
  const imgs = _imgs[storeId]
  if (!geo || !imgs) return

  let xFace, yFace
  if (geo.dir === 'v') xFace = posX > geo.ax ? geo.ax + 1 : geo.ax
  else                  yFace = posY > geo.ay ? geo.ay + 1 : geo.ay

  const panels = [
    { key: 'left',  lo: 0.00, hi: 0.32 },
    { key: 'right', lo: 0.68, hi: 1.00 },
  ]

  for (const panel of panels) {
    const imgArr = imgs[panel.key]
    if (!imgArr || imgArr.length === 0) continue
    const imgIndex = Math.floor((t || 0) / 15) % imgArr.length
    const img = imgArr[imgIndex]
    if (!_ready(img)) continue

    const wStart = geo.dir === 'v'
      ? geo.ay + geo.size * panel.lo : geo.ax + geo.size * panel.lo
    const wEnd   = geo.dir === 'v'
      ? geo.ay + geo.size * panel.hi : geo.ax + geo.size * panel.hi

    // Cover-crop per column — same math as the raycaster
    for (let col = 0; col < W; col++) {
      const camX  = 2 * col / W - 1
      const rayDX = dirX + plX * camX
      const rayDY = dirY + plY * camX

      let hitCoord, pd
      if (geo.dir === 'v') {
        if (Math.abs(rayDX) < 1e-10) continue
        pd = (xFace - posX) / rayDX
        if (pd <= 0.05) continue
        hitCoord = posY + pd * rayDY
      } else {
        if (Math.abs(rayDY) < 1e-10) continue
        pd = (yFace - posY) / rayDY
        if (pd <= 0.05) continue
        hitCoord = posX + pd * rayDX
      }

      if (hitCoord < wStart || hitCoord > wEnd) continue

      let frac = (hitCoord - wStart) / (wEnd - wStart)
      if (geo.dir === 'v' && plY < 0) frac = 1 - frac
      if (geo.dir === 'h' && plX < 0) frac = 1 - frac

      const srcX = Math.floor(frac * img.naturalWidth)
      if (srcX < 0 || srcX >= img.naturalWidth) continue

      const wallH = H * WALL_HEIGHT / pd
      const top   = Math.round(H / 2 - wallH / 2)
      const h     = Math.round(wallH)
      if (h < 1) continue

      const fade = Math.max(0, Math.min(1, (14 - pd) / 10))
      if (fade <= 0) continue

      ctx.globalAlpha = fade
      ctx.drawImage(img, srcX, 0, 1, img.naturalHeight, col, top, 1, h)
    }
  }
}
