// ═══════════════════════════════════════════════════════════════
// spineAvatarManager.js — ONE shared PIXI Application for all Spine avatars
//
// Replaces the one-WebGL-context-per-avatar Ghost Canvas pattern with a slot
// atlas: a single 3200×1200 canvas divided into eight 800×600 slots. Every
// avatar renders in ONE app.render() per frame; the raycaster blits each slot
// with the 9-arg ctx.drawImage(srcRect) form. One context, one render, one
// readback path — regardless of avatar count.
//
// Spec:    pipeline/01-architect/pixi-shared-context-spec.md (R2)
// Critique: pipeline/02-critic/pixi-shared-context-critique.md (sources C1–C10)
// Pattern reference: https://threejs.org/manual/en/multiple-scenes.html
// Context-loss handling: https://wikis.khronos.org/webgl/HandlingContextLost
// ═══════════════════════════════════════════════════════════════

import { Application, Container, Graphics } from 'pixi.js'

export const SLOT_W = 800   // per-slot dimensions — mixer README canvas size
export const SLOT_H = 600
export const COLS   = 4
export const ROWS   = 2
export const MAX_SPINE_AVATARS = COLS * ROWS   // 8 — slot 0 reserved for self
// Canvas area: 3200×1200 = 3.84M px — well under iOS Safari's 16,777,216 px
// canvas-area cap (https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/).

let _app         = null
let _dirty       = false
let _contextLost = false
const _slots     = new Array(MAX_SPINE_AVATARS).fill(null)  // index → { container, spine }
const _instances = new Set()   // live SpineAvatarInstance refs (context-restore notify)
const _scanQueue = []          // instances awaiting a same-task feet scan

function _ensureApp () {
  if (_app) return _app
  _app = new Application({
    width:  SLOT_W * COLS,
    height: SLOT_H * ROWS,
    backgroundAlpha: 0,
    autoStart:       false,
    resolution:      1,
    // R2 MEDIUM-4: every read of this canvas (raycaster drawImage + feet scans)
    // happens in the SAME task as app.render(), so the drawing buffer is still
    // intact without preserveDrawingBuffer. Leaving it false avoids the known
    // optimization penalty (MDN WebGL best practices).
    preserveDrawingBuffer: false,
    // R2 LOW-8: the full-framebuffer clear on each render is what guarantees a
    // released slot draws transparent. DO NOT disable as an "optimization" —
    // freed slots would show the previous owner's last frame (ghost avatars).
    clearBeforeRender: true,
  })
  _app.stage.eventMode = 'none'
  _app.stage.interactiveChildren = false

  // Khronos HandlingContextLost pattern: preventDefault() marks the context
  // restorable. v1 restore is best-effort — instances mark themselves not-ready
  // and re-init on the next avatar-change / prune cycle.
  const view = _app.view
  view.addEventListener?.('webglcontextlost', (e) => {
    e.preventDefault()
    _contextLost = true
    console.warn('[SpineAvatarManager] WebGL context lost')
  })
  view.addEventListener?.('webglcontextrestored', () => {
    _contextLost = false
    console.warn('[SpineAvatarManager] WebGL context restored — avatars will lazily re-init')
    for (const inst of _instances) inst._onContextRestored?.()
  })
  return _app
}

function _slotOrigin (i) {
  return { x: (i % COLS) * SLOT_W, y: ((i / COLS) | 0) * SLOT_H }
}

function _acquire (index, spine, feetY) {
  const app = _ensureApp()
  const { x, y } = _slotOrigin(index)

  const container = new Container()
  container.position.set(x, y)

  // R2 MEDIUM-2: per-slot clip mask — oversized animation frames cannot bleed
  // into a neighbour's slot. Graphics masks clip; cullArea would only cull.
  // Accepted cost: one batch break per masked slot (≤8/frame).
  const mask = new Graphics().beginFill(0xffffff).drawRect(0, 0, SLOT_W, SLOT_H).endFill()
  container.addChild(mask)
  container.mask = mask

  // Same in-slot placement as the old per-canvas build: centered x, origin at feetY.
  spine.position.set(SLOT_W / 2, feetY)
  container.addChild(spine)
  app.stage.addChild(container)

  _slots[index] = { container, spine }
  _dirty = true
  return { index, x, y }
}

// R2 MEDIUM-3: slot 0 is structurally reserved for the local player. The self
// genes fetch (GraphQL + mixer build + CDN textures) is the slowest avatar path
// and must never lose the slot race to faster-loading remotes.
export function acquireSelfSlot (spine, feetY) {
  if (_slots[0]) return null
  return _acquire(0, spine, feetY)
}

export function acquireSlot (spine, feetY) {
  for (let i = 1; i < MAX_SPINE_AVATARS; i++) {
    if (!_slots[i]) return _acquire(i, spine, feetY)
  }
  return null   // exhausted → caller falls back to GenericSpineAvatarInstance
}

export function releaseSlot (index) {
  const s = _slots[index]
  if (!s) return
  // The Spine object is destroyed by its owning instance — detach it first so
  // container.destroy({children}) doesn't double-destroy it.
  s.container.removeChild(s.spine)
  s.container.destroy({ children: true })   // container + mask
  _slots[index] = null
  _dirty = true   // next renderAll's full clear blanks the freed region
}

export function registerInstance   (inst) { _instances.add(inst) }
export function unregisterInstance (inst) { _instances.delete(inst) }
export function markDirty     ()     { _dirty = true }
export function queueFeetScan (inst) { _scanQueue.push(inst) }
export function getSharedCanvas ()   { return _ensureApp().view }
export function activeSlotCount ()   { return _slots.filter(Boolean).length }
export function isContextLost ()     { return _contextLost }

// ONE render per game frame — called from renderer.renderFrame() AFTER all
// update(dt) passes (remotes in renderFrame pass 1; self in renderThirdPerson).
// Dirty-flag no-op when nothing advanced this frame (R2 HIGH-1).
export function renderAll () {
  if (!_app || !_dirty || _contextLost) return
  _dirty = false
  _app.render()

  // Same-task feet scans: with preserveDrawingBuffer:false the drawing buffer
  // is only guaranteed until this task ends — scan immediately after render.
  while (_scanQueue.length) {
    const inst = _scanQueue.pop()
    if (inst && !inst._destroyed && inst._slot !== null) inst._scanFeet(_app.view)
  }
}
