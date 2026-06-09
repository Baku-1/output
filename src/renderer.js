// ═══════════════════════════════════════════════════════════════
// renderer.js — DDA raycaster + sprite billboard caster
// The Outlet — WebZone 001
//
// Pipeline:
//   Floor/Ceiling → Wall DDA (fills zBuf) → Sprite Cast (checks zBuf)
//   → putImageData (upscale) → Canvas overlays (crosshair, vignette, name tags)
// ═══════════════════════════════════════════════════════════════
import { MAP, MAP_W, MAP_H, CELL, CELL_STORE, STORES, STORE_GEOMETRY } from './map.js'
import { RENDER_SCALE, WALL_HEIGHT, AVATAR_TEX_SIZE, AVATAR_SPRITE_SCALE, WALL_TEX_SIZE, STORE_TEX_SIZE } from './config.js'
import { WING_COLORS, getZone } from './map.js'
import { NPCS, NPC_CHARACTERS } from './npcs.js'
import { SpineAvatarInstance } from './spineAvatar.js'
import { GenericSpineAvatarInstance } from './genericSpineAvatar.js'

// ── Per-frame delta tracker — updated in renderFrame() ───────────
let _lastRenderT = 0


// ── Utility ───────────────────────────────────────────────────
export function hexRGB(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
}

// ── Wall texture (brick / concrete) ──────────────────────────
const NOISE = new Uint8Array(512 * 512)
for (let i = 0; i < NOISE.length; i++) NOISE[i] = Math.round(Math.random() * 255)
const _tmp = new Uint8Array(NOISE)
for (let y = 1; y < 511; y++) for (let x = 1; x < 511; x++) {
  let s = 0
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += _tmp[(y+dy)*512+(x+dx)]
  NOISE[y*512+x] = Math.round(s/9)
}

const W = WALL_TEX_SIZE  // 64
const TEX_WALL = (() => {
  const b = new Uint8Array(W * W * 4)
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i  = (y * W + x) * 4
    const g  = (NOISE[((y*512+x) & 0x3FFFF)] / 255 - .5) * 36
    const m  = (y%16===0||y%16===15) ? -22 : 0
    const bx = (Math.floor(y/16)%2===0) ? x : (x+32)%64
    const vm = (bx%32===0||bx%32===31) ? -16 : 0
    const v  = Math.max(0, Math.min(255, 192+g+m+vm))
    b[i]=v; b[i+1]=v; b[i+2]=Math.min(255,v+6); b[i+3]=255
  }
  return b
})()

// ── Theater storefront textures (Canvas-drawn, 128×128) ──────
// 3-panel layout: [ POSTER | DOOR 🚪 | POSTER ]
// 128px gives enough resolution for readable marquee text
//
// Column zones (128px):
//   0-  3  left neon edge
//   4- 40  left poster panel
//  41- 87  center door arch
//  88-123  right poster panel
// 124-127  right neon edge
//
// Row zones (128px):
//   0-  3  top neon strip
//   4- 19  marquee (game name — large readable text)
//  20-113  main body (poster art / door)
// 114-124  base sill
// 125-127  bottom neon strip

// Door column range — proportional to STORE_TEX_SIZE (41/128 and 87/128 of full width)
const DOOR_COL_L = Math.round(STORE_TEX_SIZE * 0.320)
const DOOR_COL_R = Math.round(STORE_TEX_SIZE * 0.680)

// Cover-crop helper: draws img into (dx,dy,dw,dh) filling the area, centred
function _drawCover(c, img, dx, dy, dw, dh) {
  const ar = img.width / img.height, panelAr = dw / dh
  let sw, sh, sx, sy
  if (ar > panelAr) { sh=img.height; sw=sh*panelAr; sx=(img.width-sw)/2; sy=0 }
  else               { sw=img.width;  sh=sw/panelAr; sx=0; sy=(img.height-sh)/2 }
  c.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

// imgs = { poster_left, poster_right, logo } — all optional HTMLImageElements
function makeStoreTex(storeId, imgs={}) {
  const store = STORES[storeId]
  const [sr, sg, sb] = hexRGB(store.hex)
  const S  = STORE_TEX_SIZE        // e.g. 256
  const sc = S / 128               // scale factor — all pixel coords × sc

  const oc = document.createElement('canvas')
  oc.width = S; oc.height = S
  const c  = oc.getContext('2d')

  // ── Column / row zones (proportional to S via sc) ────────────
  const dL = Math.round(41*sc), dR = Math.round(87*sc)   // door left / right cols
  const pT = Math.round(20*sc), pB = Math.round(114*sc)  // poster / door top / bottom rows
  const mH = Math.round(20*sc)                            // marquee height

  // ── DOOR backing — draw first so posters paint cleanly over edges
  c.fillStyle = 'rgb(4,4,8)'
  c.fillRect(dL, 0, dR-dL, S)

  // ── POSTER panels — key art when available, procedural fallback otherwise
  // Poster panels: solid game-color gradient + logo centred.
  // Key art stays in the detail card where the browser renders it crisp.
  const drawPoster = (pL, pR) => {
    const pw=pR-pL, ph=pB-pT
    // Saturated brand-colour gradient
    const bg = c.createLinearGradient(0, pT, 0, pB)
    bg.addColorStop(0,   `rgba(${sr},${sg},${sb},0.80)`)
    bg.addColorStop(0.5, `rgba(${sr},${sg},${sb},0.60)`)
    bg.addColorStop(1,   `rgba(${sr},${sg},${sb},0.35)`)
    c.fillStyle = bg; c.fillRect(pL, pT, pw, ph)
    // Scan-lines for screen feel
    c.fillStyle = 'rgba(0,0,0,0.22)'
    for (let row = pT; row < pB; row += Math.max(2, sc*4)) c.fillRect(pL, row, pw, Math.max(1,sc))
    // Panel art handled by store-overlays.js (per-column, native resolution)
    // Frame border
    c.strokeStyle = store.hex; c.lineWidth = Math.max(1, sc*1.5)
    c.strokeRect(pL+sc, pT+sc, pw-2*sc, ph-2*sc)
  }
  drawPoster(Math.round(4*sc),  Math.round(40*sc))
  drawPoster(Math.round(88*sc), Math.round(123*sc))

  // ── EDGE neon strips
  c.fillStyle = `rgb(${sr*.04|0},${sg*.04|0},${sb*.04|0})`
  c.fillRect(0, 0, Math.round(4*sc), S)
  c.fillRect(S - Math.round(4*sc), 0, Math.round(4*sc), S)

  // ── MARQUEE — always text (logo at marquee scale is too small and pixelates)
  c.fillStyle = `rgba(${Math.round(sr*.18)},${Math.round(sg*.18)},${Math.round(sb*.18)},0.95)`
  c.fillRect(0, 0, S, mH)
  c.fillStyle = store.hex
  c.fillRect(0, 0, S, Math.max(1, sc*2.5))
  c.fillRect(0, mH - Math.max(1,sc*2.5), S, Math.max(1, sc*2.5))
  c.font = `bold ${Math.round(10*sc)}px monospace`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillStyle = store.hex; c.globalAlpha = 0.96
  c.fillText(store.name.toUpperCase(), S/2, mH/2)
  c.globalAlpha = 1

  // ── DOOR DETAILS
  const cx2 = (dL+dR)/2
  c.strokeStyle = store.hex; c.lineWidth = Math.max(1, sc*2)
  c.strokeRect(dL + Math.round(3*sc), pT + Math.round(3*sc), dR-dL - Math.round(6*sc), pB-pT - Math.round(4*sc))
  c.fillStyle = store.hex
  c.fillRect(dL + Math.round(3*sc), pT + Math.round(3*sc), dR-dL - Math.round(6*sc), Math.round(3*sc))
  const dGlow = c.createLinearGradient(0, pT + Math.round(40*sc), 0, pB)
  dGlow.addColorStop(0, `rgba(${sr},${sg},${sb},0)`)
  dGlow.addColorStop(1, `rgba(${sr},${sg},${sb},0.38)`)
  c.fillStyle = dGlow
  c.fillRect(dL + Math.round(5*sc), pT + Math.round(40*sc), dR-dL - Math.round(10*sc), pB - pT - Math.round(43*sc))
  c.fillStyle = store.hex
  c.fillRect(cx2 - Math.round(9*sc), pB - Math.round(26*sc), Math.round(7*sc), Math.round(10*sc))
  c.fillRect(cx2 + Math.round(2*sc), pB - Math.round(26*sc), Math.round(7*sc), Math.round(10*sc))
  c.font = `bold ${Math.round(8*sc)}px monospace`; c.textAlign='center'; c.textBaseline='bottom'
  c.fillStyle = `rgba(${sr},${sg},${sb},0.75)`
  c.fillText('[ ENTER ]', cx2, pB - Math.round(3*sc))

  // ── BASE SILL
  c.fillStyle = `rgba(${sr},${sg},${sb},0.25)`
  c.fillRect(0, pB, S, Math.round(11*sc))
  c.fillStyle = store.hex
  c.fillRect(0, pB, S, Math.round(2*sc))

  // ── BOTTOM NEON STRIP
  c.fillStyle = store.hex
  c.fillRect(0, S-2, S, 2)

  const imgData = c.getImageData(0, 0, S, S)
  return new Uint8Array(imgData.data.buffer)
}

// Build texture map (initially without images — procedural fallback)
const TEXTURES = { [CELL.WALL]: TEX_WALL }
Object.entries(CELL_STORE).forEach(([id, sid]) => { TEXTURES[id] = makeStoreTex(sid) })

// ── Async asset loader ────────────────────────────────────────
// Loads store images in the background; rebuilds textures when ready.
// Call once after the renderer is initialised.
export async function initStoreAssets() {
  const loadImg = url => new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)   // graceful fallback on 404
    img.src = url
  })

  for (const [storeId, store] of Object.entries(STORES)) {
    if (!store.assets) continue
    const { logo } = store.assets
    const imgLogo = logo ? await loadImg(logo) : null
    const imgs = { logo: imgLogo }
    // Rebuild texture with real imagery and update the live TEXTURES map
    const cellId = Object.entries(CELL_STORE).find(([,v]) => v === storeId)?.[0]
    if (cellId) TEXTURES[cellId] = makeStoreTex(storeId, imgs)
  }
}

const STORE_RGB = {}
Object.entries(STORES).forEach(([id, s]) => { STORE_RGB[id] = hexRGB(s.hex) })

// Wall = 64×64, store = 128×128 — look up per cell type
function texSz(wallType) { return wallType === CELL.WALL ? WALL_TEX_SIZE : STORE_TEX_SIZE }

// ── Canvas setup ──────────────────────────────────────────────
let canvas, ctx, offCanvas, offCtx, RW, RH, imgData, pixels, zBuf
// Per-column sprite depth — written by _drawSpineOverlay, read by store-overlays.js
// Infinity = no sprite at that column. Values are transform depth (ty).
export let spriteZBuf = null

export function initRenderer(canvasEl) {
  canvas    = canvasEl
  ctx       = canvas.getContext('2d')
  offCanvas = document.createElement('canvas')
  offCtx    = offCanvas.getContext('2d')
  resizeRenderer()
  window.addEventListener('resize', resizeRenderer)
}

function resizeRenderer() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  // Cap render resolution — beyond 640 columns the floor/ceiling loop
  // takes 50ms+/frame on desktop. CSS upscaling covers the rest.
  const MAX_COLS = 640
  const scaledW = Math.ceil(canvas.width  * RENDER_SCALE)
  const scaledH = Math.ceil(canvas.height * RENDER_SCALE)
  if (scaledW > MAX_COLS) {
    RW = MAX_COLS
    RH = Math.ceil(scaledH * (MAX_COLS / scaledW)) | 0
  } else {
    RW = scaledW | 0
    RH = scaledH | 0
  }
  offCanvas.width  = RW
  offCanvas.height = RH
  imgData = offCtx.createImageData(RW, RH)
  pixels  = imgData.data
  zBuf      = new Float32Array(RW)
  spriteZBuf = new Float32Array(canvas.width).fill(Infinity)
}

// ── Main render call ──────────────────────────────────────────
export function renderThirdPerson(posX, posY, dirX, dirY, plX, plY, t, remoteCache, nearStoreId, selfTexture) {
  // Clear sprite depth buffer each frame
  if (spriteZBuf) spriteZBuf.fill(Infinity)
  const MAX_DIST = 4.5
  const STEP = 0.25

  // Walk backward from player; stop before wall or map edge
  let camX = posX, camY = posY, camDist = 0
  for (let d = STEP; d <= MAX_DIST; d += STEP) {
    const tx = posX - dirX * d
    const ty = posY - dirY * d
    const mx = tx | 0, my = ty | 0
    if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) break
    if (MAP[my][mx] !== CELL.FLOOR) break
    camX = tx; camY = ty; camDist = d
  }

  // Render world from offset camera — no self-sprite in the billboard pass
  renderFrame(camX, camY, dirX, dirY, plX, plY, t, remoteCache, nearStoreId, null)

  // Self-avatar is drawn by main.js AFTER updateStoreOverlays so it always sits on top
  // Return camera pos + a deferred draw fn for the caller
  const _self = selfTexture && camDist > 0.5
    ? () => _drawSelfOverlay(selfTexture, t, camX, camY, dirX, dirY, plX, plY, posX, posY)
    : null

  return { camX, camY, drawSelf: _self }
}

// ── Third-person self overlay — screen-space draw ─────────────
// Draws the player's own avatar sprite as a 2D element centered
// slightly below mid-screen. Size scales with camera distance (closer = bigger).
function _drawSelfOverlay(selfTexture, t, camX, camY, dirX, dirY, plX, plY, playerX, playerY) {
  const W = canvas.width, H = canvas.height

  // Project player world position onto screen using camera transform
  const sx = playerX - camX, sy = playerY - camY
  const invDet = 1.0 / (plX * dirY - dirX * plY)
  const tx = invDet * ( dirY * sx - dirX * sy)
  const ty = invDet * (-plY  * sx + plX  * sy)
  if (ty <= 0.15) return

  const screenX = Math.round((W / 2) * (1 + tx / ty))

  // Scale sprite height by distance — same formula as billboard pass
  const spriteH = Math.abs(Math.round(H * WALL_HEIGHT * AVATAR_SPRITE_SCALE / ty))
  const spriteW = Math.round(spriteH * 0.75)

  // Vertical position: sprite bottom anchored to floor projection line
  const dy = Math.round((H - spriteH) / 2)
  const dx = screenX - (spriteW >> 1)

  if (spriteH <= 0 || spriteW <= 0) return

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (selfTexture instanceof SpineAvatarInstance || selfTexture instanceof GenericSpineAvatarInstance) {
    selfTexture.update(t - (selfTexture._lastT || 0))
    selfTexture._lastT = t
    if (selfTexture.isReady && selfTexture._canvas) {
      ctx.drawImage(selfTexture._canvas, dx, dy, spriteW, spriteH)
    }
  } else if (selfTexture) {
    if (!_drawSelfOverlay._cache || _drawSelfOverlay._cacheSrc !== selfTexture) {
      const S = AVATAR_TEX_SIZE
      const c = document.createElement('canvas')
      c.width = S; c.height = S
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(selfTexture.buffer), S, S), 0, 0)
      _drawSelfOverlay._cache = c
      _drawSelfOverlay._cacheSrc = selfTexture
    }
    ctx.drawImage(_drawSelfOverlay._cache, dx, dy, spriteW, spriteH)
  }

  ctx.restore()
}

export function renderFrame(posX, posY, dirX, dirY, plX, plY, t, remoteCache, nearStoreId, selfSprite = null) {
  // Clear sprite depth buffer each frame
  if (spriteZBuf) spriteZBuf.fill(Infinity)
  const W2 = RW, H2 = RH, px = pixels, halfH = H2 * .5

  // ── 1. Floor + Ceiling ──────────────────────────────────────
  for (let y = 0; y < H2; y++) {
    const isFloor = y > halfH
    const p = isFloor ? (y - halfH) : (halfH - y)
    if (p < .01) continue
    const rowDist = halfH / p
    const rdx0=dirX-plX, rdy0=dirY-plY, rdx1=dirX+plX, rdy1=dirY+plY
    const sfx = rowDist*(rdx1-rdx0)/W2, sfy = rowDist*(rdy1-rdy0)/W2
    let fx = posX+rowDist*rdx0, fy = posY+rowDist*rdy0
    const fog = Math.max(0, Math.min(1, 1 - rowDist/(MAP_H*.6)))
    for (let x = 0; x < W2; x++) {
      const tx=fx|0, ty=fy|0, idx=(y*W2+x)*4
      if (isFloor) {
        const chk = ((((tx%2)+2)%2) ^ (((ty%2)+2)%2))
        const ff  = .28 + fog*.72
        if (chk===0) { px[idx]=Math.round(62*ff);  px[idx+1]=Math.round(6*ff);  px[idx+2]=Math.round(108*ff) }
        else         { px[idx]=Math.round(8*ff);   px[idx+1]=Math.round(82*ff); px[idx+2]=Math.round(26*ff) }
      } else {
        const fx2=fx-tx, fy2=fy-ty
        const grout=(fx2<.045||fx2>.955||fy2<.045||fy2>.955)?.52:1
        const v=Math.round((78+fog*148)*grout), vb=Math.round((82+fog*155)*grout)
        px[idx]=v; px[idx+1]=v; px[idx+2]=vb
      }
      px[idx+3]=255; fx+=sfx; fy+=sfy
    }
  }

  // ── 2. Wall DDA — fills zBuf ────────────────────────────────
  for (let x = 0; x < W2; x++) {
    const camX=2*x/W2-1, rayDX=dirX+plX*camX, rayDY=dirY+plY*camX
    let mapX=posX|0, mapY=posY|0
    const ddx = Math.abs(rayDX)<1e-10?1e30:Math.abs(1/rayDX)
    const ddy = Math.abs(rayDY)<1e-10?1e30:Math.abs(1/rayDY)
    let stepX,stepY,sdx,sdy
    if(rayDX<0){stepX=-1;sdx=(posX-mapX)*ddx}else{stepX=1;sdx=(mapX+1-posX)*ddx}
    if(rayDY<0){stepY=-1;sdy=(posY-mapY)*ddy}else{stepY=1;sdy=(mapY+1-posY)*ddy}
    let side=0, wallType=CELL.WALL
    for(let s=0;s<128;s++){
      if(sdx<sdy){sdx+=ddx;mapX+=stepX;side=0}else{sdy+=ddy;mapY+=stepY;side=1}
      if(mapX<0||mapX>=MAP_W||mapY<0||mapY>=MAP_H){wallType=CELL.WALL;break}
      const cell=MAP[mapY][mapX]; if(cell>0){wallType=cell;break}
    }
    const pd = side===0?(mapX-posX+(1-stepX)/2)/rayDX:(mapY-posY+(1-stepY)/2)/rayDY
    zBuf[x] = pd<=0?1e30:pd
    if(pd<=0) continue

    const sliceH = Math.round(H2*WALL_HEIGHT/pd)
    const dTop   = Math.max(0, ((H2-sliceH)/2)|0)
    const dBot   = Math.min(H2-1, ((H2+sliceH)/2)|0)

    let wallX = side===0?(posY+pd*rayDY):(posX+pd*rayDX); wallX-=Math.floor(wallX)
    const storeId = CELL_STORE[wallType]
    const tSz = texSz(wallType)
    let texX
    if (storeId && STORE_GEOMETRY[storeId]) {
      // Map UV across the FULL store facade so texture appears exactly once.
      // Flip direction based on camera plane sign so text never appears backwards:
      // dir='v' (x-face): localFrac goes left→right when plY > 0; flip when plY < 0
      // dir='h' (y-face): localFrac goes left→right when plX > 0; flip when plX < 0
      const geo = STORE_GEOMETRY[storeId]
      let localFrac = geo.dir==='v'
        ? (mapY - geo.ay + wallX) / geo.size
        : (mapX - geo.ax + wallX) / geo.size
      if (geo.dir === 'v' && plY < 0) localFrac = 1 - localFrac
      if (geo.dir === 'h' && plX < 0) localFrac = 1 - localFrac
      texX = Math.max(0, Math.min(tSz-1, (localFrac * tSz)|0))
    } else {
      texX = (wallX*tSz)|0
      if((side===0&&rayDX>0)||(side===1&&rayDY<0)) texX=tSz-1-texX
    }

    const fog    = Math.max(0, Math.min(1, 1-pd/(MAP_H*.65)))
    const bright = fog*(side===1?.75:1)
    const tex    = TEXTURES[wallType]||TEX_WALL

    const step2  = tSz/sliceH
    let texPos   = (dTop-(H2-sliceH)/2)*step2

    const sRGB   = storeId ? STORE_RGB[storeId] : null

    // ── Per-column pre-computations (hoist Math.sin out of y loop) ──
    // This is the key performance fix: sin/cos called once per column, not per pixel
    let pulse_col=0, sweep_pos=0, nearPulse=1, isDoorCol=false
    if (sRGB) {
      pulse_col = Math.sin(t*2.1 + wallType) * .5 + .5
      sweep_pos = (t*.38 + wallType*.09) % 1
      isDoorCol = texX >= DOOR_COL_L && texX <= DOOR_COL_R  // 41-87 at 128px
      nearPulse = (nearStoreId && storeId===nearStoreId && isDoorCol)
        ? 1.3 + Math.sin(t*4) * .15
        : 1.0
    }

    for (let y = dTop; y <= dBot; y++, texPos+=step2) {
      const texY = Math.min(tSz-1, texPos|0)
      const ti   = (texY*tSz+texX)*4
      let r=tex[ti], g=tex[ti+1], b=tex[ti+2]

      if (sRGB) {
        const ty01   = texY / tSz
        const onScan = Math.abs(ty01-sweep_pos) < .04 ? 1.4 : 1
        const crt    = texY%3===0 ? .72 : 1
        const tint   = pulse_col * .4 * crt * onScan * nearPulse

        r = Math.min(255, (r + sRGB[0]*tint*.28 + .5)|0)
        g = Math.min(255, (g + sRGB[1]*tint*.28 + .5)|0)
        b = Math.min(255, (b + sRGB[2]*tint*.28 + .5)|0)

        // occasional glitch flash (per-column check, not per pixel)
      }

      const idx2=(y*W2+x)*4
      px[idx2]   = Math.max(0, Math.min(255, (r*bright+.5)|0))
      px[idx2+1] = Math.max(0, Math.min(255, (g*bright+.5)|0))
      px[idx2+2] = Math.max(0, Math.min(255, (b*bright+.5)|0))
      px[idx2+3] = 255
    }
  }

  // ── 3. Sprite cast — NPCs + remote players (far to near) ───
  // Per-frame delta — computed once here, used by both _drawSprites and _drawSpineOverlay
  const dt = t - _lastRenderT
  _lastRenderT = t

  // NPCs are sorted with remote players so z-buffer occlusion is correct
  _drawSprites(posX, posY, dirX, dirY, plX, plY, t, remoteCache, dt, selfSprite)
  drawNPCSprites(posX, posY, dirX, dirY, plX, plY)

  // ── 4. Flush to screen ──────────────────────────────────────
  offCtx.putImageData(imgData, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height)

  // ── 5. Spine overlays — drawImage pass at full canvas resolution ─
  // Runs after putImageData so the z-buffer reflects the final wall depths.
  // Only SpineAvatarInstance sprites; static textures were handled above.
  const W2full = canvas.width, H2full = canvas.height
  const now2 = Date.now()
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (const sp of Object.values(remoteCache)) {
    if (now2 - sp.lastSeen > 6000) continue
    if (sp.texture instanceof SpineAvatarInstance || sp.texture instanceof GenericSpineAvatarInstance) {
      _drawSpineOverlay(ctx, W2full, H2full, posX, posY, dirX, dirY, plX, plY, sp, dt)
    }
  }
  ctx.restore()

  _drawCrosshair()
  _drawVignette()
  _drawNameTags(posX, posY, dirX, dirY, plX, plY, remoteCache)
  drawNPCNameTags(posX, posY, dirX, dirY, plX, plY)
}

// ── Sprite billboard caster ───────────────────────────────────
// Handles two texture sources:
//   • Uint8Array (64×64) — static BFS-baked NFT or procedural
//   • SpineAvatarInstance (128×128) — live animated Axie via Ghost Canvas Render
function _drawSprites(posX, posY, dirX, dirY, plX, plY, t, remoteCache, dt, selfSprite = null) {
  const W2=RW, H2=RH, now=Date.now()
  const invDet = 1.0/(plX*dirY - dirX*plY)

  const sprites = Object.entries(remoteCache)
    .filter(([,p]) => now-p.lastSeen<6000)
    .map(([,p])   => ({...p, dist:(p.x-posX)**2+(p.y-posY)**2}))

  // Inject self-sprite for third-person view
  if (selfSprite) {
    sprites.push({ ...selfSprite, dist: (selfSprite.x-posX)**2+(selfSprite.y-posY)**2 })
  }

  sprites.sort((a,b) => b.dist-a.dist)

  for (const sp of sprites) {
    const sx=sp.x-posX, sy=sp.y-posY
    const tx=invDet*(dirY*sx-dirX*sy)
    const ty=invDet*(-plY*sx+plX*sy)
    if(ty<=0.1) continue

    const screenX = Math.round((W2/2)*(1+tx/ty))
    const h = Math.abs(Math.round(H2 * WALL_HEIGHT / ty))
    const w = h  // square billboard

    const dyStart=Math.max(0,Math.round((H2-h)/2))
    const dyEnd  =Math.min(H2-1,Math.round((H2+h)/2))
    const dxStart=Math.max(0,screenX-(w>>1))
    const dxEnd  =Math.min(W2-1,screenX+(w>>1))

    const fog = Math.max(0, Math.min(1, 1-ty/(MAP_H*0.65)))

    // ── Resolve texture data + size — once per sprite, not per column ────────
    let texData    = null    // Uint8ClampedArray | Uint8Array
    let texSize    = AVATAR_TEX_SIZE  // 64 for static, 128 for Spine
    let hasTexture = false

    if (sp.texture instanceof SpineAvatarInstance || sp.texture instanceof GenericSpineAvatarInstance) {
      // High-quality drawImage overlay handled in _drawSpineOverlay after pixel flush.
      // Skip pixel-sampling entirely; procedural silhouette omitted while loading.
      continue
    } else if (sp.texture !== null) {
      texData    = sp.texture
      texSize    = AVATAR_TEX_SIZE     // 64
      hasTexture = true
    }

    for (let stripe=dxStart; stripe<=dxEnd; stripe++) {
      if(ty>=zBuf[stripe]) continue

      const texU = (stripe-(screenX-(w>>1)))/w
      const edge = Math.abs(texU-0.5)*2
      if(edge>0.82) continue
      const rimLight = 1.0-edge*0.45

      for (let row=dyStart; row<=dyEnd; row++) {
        const texV = (row-dyStart)/(dyEnd-dyStart+1)
        const idx  = (row*W2+stripe)*4

        if (hasTexture) {
          const tx2=Math.min(texSize-1,Math.floor(texU*texSize))
          const ty2=Math.min(texSize-1,Math.floor(texV*texSize))
          const ti=(ty2*texSize+tx2)*4
          const a = texData[ti+3]
          if (a < 20) continue
          const mul = fog * rimLight
          pixels[idx]  =Math.max(0,Math.min(255,Math.round(texData[ti]  *mul)))
          pixels[idx+1]=Math.max(0,Math.min(255,Math.round(texData[ti+1]*mul)))
          pixels[idx+2]=Math.max(0,Math.min(255,Math.round(texData[ti+2]*mul)))
          pixels[idx+3]=255
        } else {
          const isHead = texV<0.18, isBand = texV>0.35&&texV<0.55
          const base   = fog*rimLight*(isHead?1.3:isBand?1.0:0.72)
          const pulse  = isHead?(Math.sin(t*3.5+sp.x+sp.y)*0.18+0.82):1.0
          const [cr,cg,cb]=sp.color
          pixels[idx]  =Math.max(0,Math.min(255,Math.round(cr*base*pulse)))
          pixels[idx+1]=Math.max(0,Math.min(255,Math.round(cg*base*pulse)))
          pixels[idx+2]=Math.max(0,Math.min(255,Math.round(cb*base*pulse)))
          pixels[idx+3]=255
        }
      }
    }
  }
}

// ── Spine avatar overlay ──────────────────────────────────────
// Replaces the per-pixel loop for SpineAvatarInstance objects.
// SpineAvatarInstance renders into this._canvas each update(); we read that
// canvas directly via drawImage — no pixel readback, no offscreenCanvas alias.
//
// Parameters use full canvas dimensions (W, H), not render-scale (RW, RH).
// zBuf is in render-scale coords — map with scaleX = RW / W.
function _drawSpineOverlay(ctx, W, H, posX, posY, dirX, dirY, plX, plY, sp, dt) {
  const invDet = 1.0 / (plX * dirY - dirX * plY)
  const sx = sp.x - posX, sy = sp.y - posY
  const tx = invDet * ( dirY * sx - dirX * sy)
  const ty = invDet * (-plY  * sx + plX  * sy)
  if (ty <= 0.1) return

  // Advance Spine animation — once per sprite per frame
  sp.texture.update(dt)
  // _canvas is the live offscreen canvas Spine renders into each update()
  if (!sp.texture.isReady || !sp.texture._canvas) return

  // Billboard screen rect (full-res coords)
  const screenX  = Math.round((W / 2) * (1 + tx / ty))
  const spriteH  = Math.abs(Math.round(H * WALL_HEIGHT * AVATAR_SPRITE_SCALE / ty))
  const spriteW  = Math.abs(Math.round(H * AVATAR_SPRITE_SCALE / ty))

  // Anchor feet to the floor at this depth (same floor-Y as wall bottom at distance ty).
  // SpineAvatarInstance: feet drawn at 88% of canvas height.
  // GenericSpineAvatarInstance: root bone at 97% of canvas height.
  const feetFrac = sp.texture instanceof SpineAvatarInstance ? 0.88 : 0.97
  const floorY   = Math.round(H / 2 + H * WALL_HEIGHT / (2 * ty))
  const dyStart  = floorY - Math.round(feetFrac * spriteH)
  const dyEnd    = dyStart + spriteH
  const dxCenter = screenX
  const dxStart  = dxCenter - (spriteW >> 1)   // may be off-screen — used for drawImage dest
  const dxEnd    = dxCenter + (spriteW >> 1)

  // Clamp column range to screen
  const colL = Math.max(0, dxStart)
  const colR = Math.min(W - 1, dxEnd)
  if (colL > colR || spriteW <= 0 || spriteH <= 0) return

  const fog      = Math.max(0, Math.min(1, 1 - ty / (MAP_H * 0.65)))
  const scaleX   = RW / W   // render-scale factor for zBuf lookup

  // ── Build clip path from z-buffer visible column runs ────────
  // Group consecutive visible columns into rect runs for efficiency.
  ctx.beginPath()
  let inRun = false
  let runStart = 0

  for (let col = colL; col <= colR; col++) {
    const renderCol = Math.min(RW - 1, Math.floor(col * scaleX))
    const visible   = ty < zBuf[renderCol]

    if (visible && !inRun) {
      runStart = col
      inRun    = true
    } else if (!visible && inRun) {
      ctx.rect(runStart, dyStart, col - runStart, dyEnd - dyStart)
      inRun = false
    }
  }
  if (inRun) {
    ctx.rect(runStart, dyStart, colR + 1 - runStart, dyEnd - dyStart)
  }

  ctx.save()
  ctx.clip()

  // ── drawImage — Spine's live _canvas → billboard rect ───────
  ctx.globalAlpha = fog
  ctx.drawImage(sp.texture._canvas, dxStart, dyStart, spriteW, spriteH)

  ctx.restore()
}

// ── Player name tags ──────────────────────────────────────────
function _drawNameTags(posX, posY, dirX, dirY, plX, plY, remoteCache) {
  const now=Date.now(), W2=canvas.width, H2=canvas.height
  const invDet = 1.0/(plX*dirY-dirX*plY)

  ctx.save()
  ctx.font='600 11px Rajdhani, sans-serif'
  ctx.textAlign='center'; ctx.textBaseline='bottom'

  for (const [id,sp] of Object.entries(remoteCache)) {
    if(now-sp.lastSeen>6000) continue
    const sx=sp.x-posX, sy=sp.y-posY
    const tx=invDet*(dirY*sx-dirX*sy)
    const ty=invDet*(-plY*sx+plX*sy)
    if(ty<=0.2) continue

    const screenX = Math.round((W2/2)*(1+tx/ty))
    const spriteH = Math.abs(W2 * WALL_HEIGHT * AVATAR_SPRITE_SCALE / ty)
    const nameY   = H2/2-spriteH/2-6

    if(nameY<10||nameY>H2-10) continue
    if(screenX<20||screenX>W2-20) continue

    const fog   = Math.max(0,Math.min(1,1-ty/(MAP_H*0.65)))
    const alpha = fog*0.85
    const label = '#'+id.slice(0,6).toUpperCase()
    const [cr,cg,cb]=sp.color

    const tw=ctx.measureText(label).width+8
    ctx.fillStyle='rgba(0,0,0,0.55)'
    ctx.fillRect(screenX-tw/2, nameY-14, tw, 13)
    ctx.fillStyle=`rgba(${cr},${cg},${cb},${alpha})`
    ctx.fillRect(screenX-tw/2, nameY-14, 2, 13)
    ctx.fillStyle=`rgba(255,255,255,${alpha})`
    ctx.fillText(label, screenX+1, nameY-2)
  }
  ctx.restore()
}

// ── NPC Sprite Textures ───────────────────────────────────────
// Canvas-drawn 64×64 billboard texture per NPC character.
// Designed to read clearly at small rendered sizes in the raycaster.

function makeNPCTex(characterId) {
  const char = NPC_CHARACTERS[characterId]
  const [cr, cg, cb] = char.color
  const S = 64
  const oc = document.createElement('canvas')
  oc.width = S; oc.height = S
  const c  = oc.getContext('2d')

  if (characterId === 'rebo') {
    // ── Rebo — Mall Cop ──────────────────────────────────────
    // Silhouette reads as: cap / face / uniform / badge / belt / legs

    // Legs (dark navy trousers)
    c.fillStyle = '#0a1530'
    c.fillRect(18, 52, 10, 12)
    c.fillRect(36, 52, 10, 12)
    // Shoes (black)
    c.fillStyle = '#111'
    c.fillRect(16, 61, 13, 3)
    c.fillRect(35, 61, 13, 3)

    // Body — navy uniform
    c.fillStyle = `rgb(${cr},${cg},${cb})`
    c.beginPath()
    c.roundRect(14, 22, 36, 32, 4)
    c.fill()

    // Belt — dark with gold buckle
    c.fillStyle = '#0a1530'
    c.fillRect(14, 45, 36, 5)
    c.fillStyle = '#ffd700'
    c.fillRect(29, 45, 6, 5)

    // Gold badge (star shape simplified — ring + center dot)
    c.fillStyle = '#ffd700'
    c.beginPath(); c.arc(32, 33, 5, 0, Math.PI*2); c.fill()
    c.fillStyle = `rgb(${cr},${cg},${cb})`
    c.beginPath(); c.arc(32, 33, 2.5, 0, Math.PI*2); c.fill()

    // Shoulder epaulettes
    c.fillStyle = '#ffd700'
    c.fillRect(14, 22, 5, 3)
    c.fillRect(45, 22, 5, 3)

    // Neck
    c.fillStyle = '#f0c090'
    c.fillRect(28, 15, 8, 8)

    // Head / face
    c.fillStyle = '#f0c090'
    c.beginPath(); c.ellipse(32, 11, 10, 9, 0, 0, Math.PI*2); c.fill()

    // Eyes (simple dots)
    c.fillStyle = '#333'
    c.fillRect(27, 9, 3, 3)
    c.fillRect(34, 9, 3, 3)

    // Mouth (slight grin)
    c.fillStyle = '#c0704a'
    c.fillRect(28, 14, 8, 2)

    // Cap — navy with peak and badge
    c.fillStyle = `rgb(${cr},${cg},${cb})`
    c.beginPath()
    c.ellipse(32, 6, 12, 6, 0, Math.PI, Math.PI*2)
    c.fill()
    c.fillRect(20, 5, 24, 4)
    // Cap peak (brim)
    c.fillStyle = '#0a1530'
    c.fillRect(18, 7, 28, 3)
    // Cap badge (tiny gold)
    c.fillStyle = '#ffd700'
    c.fillRect(30, 2, 4, 4)
  }

  const imgData = c.getImageData(0, 0, S, S)
  return new Uint8Array(imgData.data.buffer)
}

// Pre-bake NPC textures (one per unique character)
const NPC_TEXTURES = {}
Object.keys(NPC_CHARACTERS).forEach(id => { NPC_TEXTURES[id] = makeNPCTex(id) })

// Resolve each NPC instance with its texture + character data
export const resolvedNPCs = NPCS.map(npc => ({
  ...npc,
  ...NPC_CHARACTERS[npc.characterId],
  texture: NPC_TEXTURES[npc.characterId],
}))

// ── NPC Sprite Renderer ───────────────────────────────────────
// Same billboard projection as remote players but for fixed-position NPCs.
export function drawNPCSprites(posX, posY, dirX, dirY, plX, plY) {
  const W2 = RW, H2 = RH
  const invDet = 1.0 / (plX * dirY - dirX * plY)
  const S = 64   // NPC textures are always baked at 64×64 regardless of AVATAR_TEX_SIZE

  const sorted = resolvedNPCs
    .map(n => ({ ...n, dist: (n.x-posX)**2 + (n.y-posY)**2 }))
    .sort((a, b) => b.dist - a.dist)

  for (const npc of sorted) {
    const sx = npc.x - posX, sy = npc.y - posY
    const tx = invDet * ( dirY * sx - dirX * sy)
    const ty = invDet * (-plY  * sx + plX  * sy)
    if (ty <= 0.15) continue

    const screenX  = Math.round((W2/2) * (1 + tx/ty))
    const h        = Math.abs(Math.round(H2 * WALL_HEIGHT / ty))
    const w        = Math.abs(Math.round(H2 * 1.0 / ty))

    const dyStart  = Math.max(0,    Math.round((H2 - h) / 2))
    const dyEnd    = Math.min(H2-1, Math.round((H2 + h) / 2))
    const dxStart  = Math.max(0,    screenX - (w >> 1))
    const dxEnd    = Math.min(W2-1, screenX + (w >> 1))

    const fog      = Math.max(0, Math.min(1, 1 - ty / (MAP_H * 0.65)))

    for (let stripe = dxStart; stripe <= dxEnd; stripe++) {
      if (ty >= zBuf[stripe]) continue    // z-buffer: walls occlude NPC

      const texU = (stripe - (screenX - (w>>1))) / w
      const edge = Math.abs(texU - 0.5) * 2
      if (edge > 0.82) continue

      const rimLight = 1.0 - edge * 0.45

      for (let row = dyStart; row <= dyEnd; row++) {
        const texV = (row - dyStart) / (dyEnd - dyStart + 1)
        const tx2  = Math.min(S-1, Math.floor(texU * S))
        const ty2  = Math.min(S-1, Math.floor(texV * S))
        const ti   = (ty2 * S + tx2) * 4
        const td   = npc.texture

        // Skip near-black pixels (use as transparent for silhouette)
        if (td[ti] < 8 && td[ti+1] < 8 && td[ti+2] < 8) continue

        const idx  = (row * W2 + stripe) * 4
        pixels[idx]   = Math.max(0, Math.min(255, Math.round(td[ti]   * fog * rimLight)))
        pixels[idx+1] = Math.max(0, Math.min(255, Math.round(td[ti+1] * fog * rimLight)))
        pixels[idx+2] = Math.max(0, Math.min(255, Math.round(td[ti+2] * fog * rimLight)))
        pixels[idx+3] = 255
      }
    }
  }
}

// ── NPC Name Tags ─────────────────────────────────────────────
export function drawNPCNameTags(posX, posY, dirX, dirY, plX, plY) {
  const W2 = canvas.width, H2 = canvas.height
  const invDet = 1.0 / (plX * dirY - dirX * plY)

  ctx.save()
  ctx.font = 'bold 12px Rajdhani, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'

  for (const npc of resolvedNPCs) {
    const sx = npc.x - posX, sy = npc.y - posY
    const tx = invDet * ( dirY * sx - dirX * sy)
    const ty = invDet * (-plY  * sx + plX  * sy)
    if (ty <= 0.2) continue

    const screenX = Math.round((W2/2) * (1 + tx/ty))
    const spriteH = Math.abs(W2 * WALL_HEIGHT / ty)
    const nameY   = H2/2 - spriteH/2 - 6

    if (nameY < 10 || nameY > H2 - 10) continue
    if (screenX < 30 || screenX > W2 - 30) continue

    const fog   = Math.max(0, Math.min(1, 1 - ty / (MAP_H * 0.65)))
    const alpha = fog * 0.9
    const [cr, cg, cb] = npc.color

    // Name pill
    const label = npc.name
    const tw = ctx.measureText(label).width + 10
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(screenX - tw/2, nameY - 16, tw, 14)
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
    ctx.fillRect(screenX - tw/2, nameY - 16, 3, 14)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fillText(label, screenX + 1.5, nameY - 3)

    // Title below name (smaller)
    if (ty < 4) {
      ctx.font = '10px Rajdhani, sans-serif'
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.7})`
      ctx.fillText(npc.title, screenX, nameY + 2)
      ctx.font = 'bold 12px Rajdhani, sans-serif'
    }
  }
  ctx.restore()
}

// ── Canvas overlays ───────────────────────────────────────────
function _drawCrosshair() {
  const cx=canvas.width/2, cy=canvas.height/2
  ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(cx-9,cy); ctx.lineTo(cx+9,cy)
  ctx.moveTo(cx,cy-9); ctx.lineTo(cx,cy+9); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2)
  ctx.strokeStyle='rgba(0,229,255,.6)'; ctx.stroke()
}

function _drawVignette() {
  const W2=canvas.width, H2=canvas.height
  const g=ctx.createRadialGradient(W2/2,H2/2,0,W2/2,H2/2,Math.max(W2,H2)*.6)
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.5)')
  ctx.fillStyle=g; ctx.fillRect(0,0,W2,H2)
}

// ── Bird's-eye (overhead) view — rendered onto the main canvas ──
// Draws a zoomed 2D top-down map centred on the player.
// VIEW_CELLS controls how many map cells are visible in each direction.
const BIRDS_VIEW_CELLS = 14  // half-extent: 14 cells visible each side

export function renderBirdsEye(posX, posY, dirX, dirY, remoteCache) {
  const W = canvas.width, H = canvas.height
  const cellPx = Math.min(W, H) / (BIRDS_VIEW_CELLS * 2 + 1)  // px per cell

  ctx.save()
  // Dark background
  ctx.fillStyle = 'rgba(0,0,8,0.96)'
  ctx.fillRect(0, 0, W, H)

  // Translate so player is always centred
  const cx = W / 2, cy = H / 2
  ctx.translate(cx - posX * cellPx, cy - posY * cellPx)

  // Draw map cells
  for (let my = 0; my < MAP_H; my++) {
    for (let mx = 0; mx < MAP_W; mx++) {
      const cell = MAP[my][mx]
      if (cell === 0) {
        const zone = getZone(mx + .5, my + .5)
        ctx.fillStyle = WING_COLORS[zone.id] ? WING_COLORS[zone.id] + '30' : 'rgba(20,20,30,.8)'
      } else if (cell === CELL.WALL) {
        ctx.fillStyle = 'rgba(175,180,195,.9)'
      } else {
        const sid = CELL_STORE[cell]
        ctx.fillStyle = sid ? STORES[sid].hex : '#555'
      }
      ctx.fillRect(mx * cellPx, my * cellPx, cellPx, cellPx)
    }
  }

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(0,229,255,.04)'
  ctx.lineWidth = 0.5
  for (let mx = 0; mx <= MAP_W; mx++) {
    ctx.beginPath(); ctx.moveTo(mx * cellPx, 0); ctx.lineTo(mx * cellPx, MAP_H * cellPx); ctx.stroke()
  }
  for (let my = 0; my <= MAP_H; my++) {
    ctx.beginPath(); ctx.moveTo(0, my * cellPx); ctx.lineTo(MAP_W * cellPx, my * cellPx); ctx.stroke()
  }

  // Remote players
  const now = Date.now()
  for (const p of Object.values(remoteCache)) {
    if (now - p.lastSeen > 6000) continue
    const [r, g, b] = p.color
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.beginPath(); ctx.arc(p.x * cellPx, p.y * cellPx, cellPx * 0.38, 0, Math.PI * 2); ctx.fill()
  }

  // NPCs
  for (const npc of resolvedNPCs) {
    const [r, g, b] = npc.color
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
    ctx.beginPath(); ctx.arc(npc.x * cellPx, npc.y * cellPx, cellPx * 0.35, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Player dot + direction arrow
  const px2 = posX * cellPx, py2 = posY * cellPx
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(px2, py2, cellPx * 0.42, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(px2, py2)
  ctx.lineTo(px2 + dirX * cellPx * 1.6, py2 + dirY * cellPx * 1.6)
  ctx.stroke()

  ctx.restore()

  // HUD overlay: label
  ctx.save()
  ctx.fillStyle = 'rgba(0,229,255,0.55)'
  ctx.font = 'bold 10px Rajdhani, sans-serif'
  ctx.letterSpacing = '0.12em'
  ctx.textAlign = 'center'
  ctx.fillText("BIRD'S-EYE VIEW", W / 2, H - 14)
  ctx.restore()
}

// ── Radar Minimap ─────────────────────────────────────────────
// Shows a 32-tile radius window centered on the player.
// At 2px/tile the 65×65 tile window fills the 130×130 canvas exactly.
// Scales to any map size — never iterates the full 512×512 grid.
const RADAR_RADIUS = 32   // tiles each direction from player
const RADAR_PX     = 2    // pixels per tile

export function drawMinimap(mmCanvas, posX, posY, dirX, dirY, remoteCache) {
  const mc  = mmCanvas.getContext('2d')
  const sz  = RADAR_RADIUS * 2 + 1          // tile window (65)
  const dim = sz * RADAR_PX                  // canvas pixels used (130)

  // Background
  mc.fillStyle = 'rgba(0,0,8,0.88)'
  mc.fillRect(0, 0, mmCanvas.width, mmCanvas.height)

  const originTX = Math.floor(posX) - RADAR_RADIUS   // top-left tile x
  const originTY = Math.floor(posY) - RADAR_RADIUS   // top-left tile y

  for (let ry = 0; ry < sz; ry++) {
    const my = originTY + ry
    if (my < 0 || my >= MAP_H) continue
    for (let rx = 0; rx < sz; rx++) {
      const mx = originTX + rx
      if (mx < 0 || mx >= MAP_W) continue
      const cell = MAP[my][mx]
      const sx = rx * RADAR_PX, sy = ry * RADAR_PX

      if (cell === 0) {
        const zone = getZone(mx + 0.5, my + 0.5)
        mc.fillStyle = WING_COLORS[zone.id] ? WING_COLORS[zone.id] + '38' : 'rgba(20,20,32,0.75)'
      } else if (cell === CELL.WALL) {
        mc.fillStyle = 'rgba(175,180,195,0.85)'
      } else {
        const sid = CELL_STORE[cell]
        mc.fillStyle = sid && STORES[sid] ? STORES[sid].hex : 'rgba(175,180,195,0.85)'
      }
      mc.fillRect(sx, sy, RADAR_PX, RADAR_PX)
    }
  }

  // Player dot + direction arrow — always center of radar
  const cx = RADAR_RADIUS * RADAR_PX, cy = RADAR_RADIUS * RADAR_PX
  mc.fillStyle = '#ffffff'
  mc.beginPath(); mc.arc(cx, cy, 2.5, 0, Math.PI * 2); mc.fill()
  mc.strokeStyle = '#00e5ff'; mc.lineWidth = 1.5
  mc.beginPath(); mc.moveTo(cx, cy)
  mc.lineTo(cx + dirX * 7, cy + dirY * 7); mc.stroke()

  // Remote players
  const now = Date.now()
  for (const p of Object.values(remoteCache)) {
    if (now - p.lastSeen > 6000) continue
    const rx = (p.x - originTX) * RADAR_PX
    const ry = (p.y - originTY) * RADAR_PX
    if (rx < 0 || rx > dim || ry < 0 || ry > dim) continue
    const [r, g, b] = p.color
    mc.fillStyle = `rgb(${r},${g},${b})`
    mc.beginPath(); mc.arc(rx, ry, 2.5, 0, Math.PI * 2); mc.fill()
  }

  // Thin border
  mc.strokeStyle = 'rgba(0,229,255,0.25)'; mc.lineWidth = 1
  mc.strokeRect(0.5, 0.5, dim - 1, dim - 1)
}
