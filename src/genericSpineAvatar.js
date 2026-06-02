// ═══════════════════════════════════════════════════════════════
// genericSpineAvatar.js — 6-bone canvas rig for non-Axie NFTs
// The Outlet — WebZone 001
//
// Bone hierarchy (6 bones):
//   1. Root   — world anchor, bottom-centre of canvas (no visual)
//   2. Hip    — lower body region; drives vertical bob
//   3. Torso  — mid-body region; slight lateral sway on Hip
//   4. Head   — head region; slight nod on Torso
//   5. L-Arm  — left arm region; forward swing on Torso
//   6. R-Arm  — right arm region; opposite-phase swing on Torso
//
// Each bone carries a canvas slice of the BFS-cleaned NFT image.
// Animations are sine-driven; no external animation data required.
//
// Interface matches SpineAvatarInstance so the renderer is transparent:
//   this._canvas   — OffscreenCanvas / HTMLCanvasElement
//   this.pixelData — ImageData (refreshed every update())
//   this.isReady   — true once init() succeeds
//   async init(imgEl)
//   update(dt)
// ═══════════════════════════════════════════════════════════════

export const GENERIC_CANVAS_SIZE = 128

export class GenericSpineAvatarInstance {
  constructor(canvasSize = GENERIC_CANVAS_SIZE) {
    this._size   = canvasSize
    this._canvas = document.createElement('canvas')
    this._canvas.width = this._canvas.height = canvasSize
    this._ctx    = this._canvas.getContext('2d')

    this.pixelData = null
    this.isReady   = false
    this._t        = 0

    // Six bone visual regions (5 carry image slices; Root is transform-only)
    this._bones = null  // { lower, torso, head, lArm, rArm }
  }

  /**
   * Build the 6-bone rig from an HTMLImageElement.
   * Runs BFS background removal, then slices into bone regions.
   * @param {HTMLImageElement} imgEl
   */
  async init(imgEl) {
    try {
      const S   = this._size
      const src = _cleanToCanvas(imgEl, S)   // BFS-stripped canvas

      // ── Slice source canvas into bone regions ───────────────
      // Proportions tuned for portrait/square humanoid NFTs.
      //   Lower body (Hip bone):  bottom 42% of image, full width
      //   Torso (Torso bone):     rows 26-65%, centre 68% of width
      //   Head (Head bone):       top 30%, centre 62% of width
      //   L-Arm (L-Arm bone):     rows 26-65%, left 22% of width
      //   R-Arm (R-Arm bone):     rows 26-65%, right 22% of width
      this._bones = {
        lower: _slice(src,  0,           S * 0.58, S,           S * 0.42),
        torso: _slice(src,  S * 0.16,    S * 0.26, S * 0.68,    S * 0.39),
        head:  _slice(src,  S * 0.19,    0,        S * 0.62,    S * 0.30),
        lArm:  _slice(src,  0,           S * 0.26, S * 0.22,    S * 0.39),
        rArm:  _slice(src,  S * 0.78,    S * 0.26, S * 0.22,    S * 0.39),
      }

      this.isReady = true
      this.update(0)        // pre-render one frame so pixelData is never null
    } catch (e) {
      console.warn('[GenericSpine] init() failed:', e)
      this.isReady = false
    }
  }

  /**
   * Advance animation by deltaTime seconds and repaint the canvas.
   * Called once per avatar per frame by the raycaster.
   * @param {number} dt  seconds since last frame
   */
  update(dt) {
    if (!this.isReady || !this._bones) return
    this._t += dt

    const t   = this._t
    const S   = this._size
    const ctx = this._ctx
    ctx.clearRect(0, 0, S, S)

    // ── Bone 1: Root ─────────────────────────────────────────
    // World anchor: bottom-centre of canvas.
    const rootX = S * 0.50
    const rootY = S * 0.97

    // ── Bone 2: Hip ──────────────────────────────────────────
    // Vertical bob (idle breath / walk cycle).
    const hipBob = Math.sin(t * 4.2) * 1.4            // ±1.4 px
    const hipX   = rootX
    const hipY   = rootY + hipBob

    // ── Bone 3: Torso ────────────────────────────────────────
    // Child of Hip; slight lateral sway.
    const torsoSway = Math.sin(t * 2.1) * 0.8          // ±0.8 px
    const torsoX = hipX + torsoSway
    const torsoY = hipY - S * 0.38

    // ── Bone 4: Head ─────────────────────────────────────────
    // Child of Torso; gentle nod (rotation).
    const headNod = Math.sin(t * 1.6) * 0.025          // ±0.025 rad
    const headX   = torsoX
    const headY   = torsoY - S * 0.32

    // ── Bone 5: L-Arm ────────────────────────────────────────
    // Child of Torso; swings forward on walk.
    const lArmAngle = Math.sin(t * 4.2) * 0.20         // ±0.20 rad
    const lArmX = torsoX - S * 0.30
    const lArmY = torsoY - S * 0.04

    // ── Bone 6: R-Arm ────────────────────────────────────────
    // Child of Torso; opposite phase to L-Arm.
    const rArmAngle = -Math.sin(t * 4.2) * 0.20
    const rArmX = torsoX + S * 0.30
    const rArmY = torsoY - S * 0.04

    // ── Draw order: painter's algorithm (back → front) ───────
    const b = this._bones
    _drawBone(ctx, b.lower, hipX,   hipY,   0,          1.0)
    _drawBone(ctx, b.torso, torsoX, torsoY, 0,          1.0)
    _drawBone(ctx, b.lArm,  lArmX,  lArmY,  lArmAngle,  1.0)
    _drawBone(ctx, b.rArm,  rArmX,  rArmY,  rArmAngle,  1.0)
    _drawBone(ctx, b.head,  headX,  headY,  headNod,    1.0)

    this.pixelData = ctx.getImageData(0, 0, S, S)
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * BFS-strip the background from imgEl and return a cleaned canvas.
 * Mirrors the logic in avatarCache._removeBackground / _peelBorderConnected.
 */
function _cleanToCanvas(imgEl, S) {
  const oc  = document.createElement('canvas')
  oc.width  = oc.height = S
  const ctx = oc.getContext('2d')

  if (imgEl && imgEl.naturalWidth > 0) {
    const scale = Math.min(S / imgEl.naturalWidth, S / imgEl.naturalHeight)
    const dw = imgEl.naturalWidth  * scale
    const dh = imgEl.naturalHeight * scale
    ctx.drawImage(imgEl, (S - dw) / 2, (S - dh) / 2, dw, dh)
  }

  const imgData = ctx.getImageData(0, 0, S, S)
  const data    = imgData.data

  const hasMeaningfulAlpha = (() => {
    let n = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 240 && ++n > 64) return true
    }
    return false
  })()

  if (hasMeaningfulAlpha) {
    // Already has transparency — just peel solid border colours
    _peel(data, S, (r, g, b) => r < 55 && g < 55 && b < 55, 10)
    _peel(data, S, (r, g, b) => r > 215 && g > 215 && b > 215, 10)
  } else {
    // Detect background from border histogram, BFS-flood with depth cap
    const bgColors = _borderBgColors(data, S, 2)
    const TOL = 40, DEPTH = 10
    for (const [bgR, bgG, bgB] of bgColors) {
      _peel(data, S, (r, g, b) =>
        Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) <= TOL, DEPTH)
      if (bgR > 215 && bgG > 215 && bgB > 215)
        _peel(data, S, (r, g, b) => r > 215 && g > 215 && b > 215, DEPTH)
      if (bgR < 55 && bgG < 55 && bgB < 55)
        _peel(data, S, (r, g, b) => r < 55 && g < 55 && b < 55, DEPTH)
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return oc
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

  const out = [], used = new Uint8Array(hist.length)
  for (let n = 0; n < count; n++) {
    let best = -1, bestN = 0
    for (let i = 0; i < hist.length; i++) {
      if (!used[i] && hist[i] > bestN) { bestN = hist[i]; best = i }
    }
    if (bestN === 0) break
    used[best] = 1
    out.push([((best >> 10) & 31) << 3, ((best >> 5) & 31) << 3, (best & 31) << 3])
  }
  return out
}

function _peel(data, S, predicate, maxDepth) {
  const visited = new Uint8Array(S * S)
  const depth   = new Uint8Array(S * S)
  depth.fill(255)
  const qx = new Int16Array(S * S)
  const qy = new Int16Array(S * S)
  let head = 0, tail = 0

  const enq = (x, y, d) => {
    if (x < 0 || x >= S || y < 0 || y >= S) return
    if (d > maxDepth || visited[y * S + x]) return
    visited[y * S + x] = 1
    depth[y * S + x]   = d
    qx[tail] = x; qy[tail] = y; tail++
  }

  for (let x = 0; x < S; x++) { enq(x, 0, 0); enq(x, S - 1, 0) }
  for (let y = 1; y < S - 1; y++) { enq(0, y, 0); enq(S - 1, y, 0) }

  while (head < tail) {
    const x = qx[head], y = qy[head++]
    const d = depth[y * S + x]
    if (d > maxDepth) continue
    const i = (y * S + x) * 4
    if (data[i + 3] === 0 || predicate(data[i], data[i + 1], data[i + 2])) {
      data[i + 3] = 0
      const nd = d + 1
      if (nd <= maxDepth) {
        enq(x + 1, y, nd); enq(x - 1, y, nd)
        enq(x, y + 1, nd); enq(x, y - 1, nd)
      }
    }
  }
}

/**
 * Cut a rectangular region out of srcCanvas and return a new canvas.
 * Coordinates/sizes are floats — rounded internally.
 */
function _slice(srcCanvas, sx, sy, sw, sh) {
  sx = Math.round(sx); sy = Math.round(sy)
  sw = Math.round(Math.max(1, Math.min(sw, srcCanvas.width  - sx)))
  sh = Math.round(Math.max(1, Math.min(sh, srcCanvas.height - sy)))

  const oc  = document.createElement('canvas')
  oc.width  = sw; oc.height = sh
  oc.getContext('2d').drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return oc
}

/**
 * Draw a bone's canvas region centred at (cx, cy) with rotation angle.
 */
function _drawBone(ctx, canvas, cx, cy, angle, alpha) {
  if (!canvas) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  if (angle !== 0) ctx.rotate(angle)
  ctx.drawImage(canvas, -canvas.width * 0.5, -canvas.height * 0.5)
  ctx.restore()
}
