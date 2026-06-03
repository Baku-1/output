// ═══════════════════════════════════════════════════════════════
// touch.js — Mobile controls for The Outlet
//
// Left half:  virtual joystick (movement)
// Right half: drag to rotate camera
// Interact button: appears near stores/NPCs
//
// Exports:
//   initTouch()              → sets up all listeners + DOM
//   touchMoveX, touchMoveY   → normalized joystick vector (-1..1)
//   consumeRotation()        → returns and zeroes accumulated rotation
//   isTouchDevice            → boolean
//   setInteractCallback(fn)  → register interact handler
//   setInteractVisible(bool) → show/hide interact button
// ═══════════════════════════════════════════════════════════════

export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)

// ── Joystick output (read by update() in main.js) ─────────────
export let touchMoveX = 0  // -1 (left) to 1 (right)
export let touchMoveY = 0  // -1 (forward) to 1 (backward)

// ── Rotation output ───────────────────────────────────────────
let _rotAccum = 0
export function consumeRotation() {
  const r = _rotAccum
  _rotAccum = 0
  return r
}

// ── Constants ─────────────────────────────────────────────────
const STICK_RADIUS    = 50   // px — max travel from center
const DEAD_ZONE       = 0.15 // fraction of radius
const ROTATE_SENS     = 0.004 // radians per px of horizontal drag

// ── Touch tracking ────────────────────────────────────────────
let stickTouchId  = -1
let stickCenterX  = 0
let stickCenterY  = 0
let lookTouchId   = -1
let lookLastX     = 0

// ── DOM refs (created once in initTouch) ──────────────────────
let stickBase  = null
let stickKnob  = null
let interactBtn = null

// ── Interact callback (set by main.js) ────────────────────────
let _onInteract = null
export function setInteractCallback(fn) { _onInteract = fn }

let _interactVisible = false
export function setInteractVisible(visible, label) {
  if (visible === _interactVisible) {
    if (visible && label && interactBtn) interactBtn.textContent = label
    return
  }
  _interactVisible = visible
  if (!interactBtn) return
  interactBtn.style.opacity = visible ? '1' : '0'
  interactBtn.style.pointerEvents = visible ? 'auto' : 'none'
  if (label) interactBtn.textContent = label
}

export function initTouch() {
  if (!isTouchDevice) return

  // ── Build DOM ─────────────────────────────────────────────
  const overlay = document.createElement('div')
  overlay.id = 'touch-overlay'
  document.body.appendChild(overlay)

  // Joystick base (static ring)
  stickBase = document.createElement('div')
  stickBase.id = 'joy-base'
  overlay.appendChild(stickBase)

  // Joystick knob (moves with finger)
  stickKnob = document.createElement('div')
  stickKnob.id = 'joy-knob'
  stickBase.appendChild(stickKnob)

  // Interact button — bottom right, above minimap
  interactBtn = document.createElement('button')
  interactBtn.id = 'touch-interact'
  interactBtn.textContent = 'F'
  interactBtn.style.opacity = '0'
  interactBtn.style.pointerEvents = 'none'
  overlay.appendChild(interactBtn)

  interactBtn.addEventListener('touchstart', e => {
    e.preventDefault()
    e.stopPropagation()
    if (_onInteract) _onInteract()
  }, { passive: false })

  // Hide desktop controls legend on touch devices
  const ctrl = document.getElementById('ctrl')
  if (ctrl) ctrl.style.display = 'none'

  // ── Touch event listeners on canvas ───────────────────────
  const canvas = document.getElementById('c')
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
  canvas.addEventListener('touchcancel', onTouchEnd,  { passive: false })

  // Prevent iOS elastic bounce and pinch zoom
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault()
  }, { passive: false })
}

function onTouchStart(e) {
  e.preventDefault()
  const w = window.innerWidth

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]
    if (t.clientX < w * 0.45 && stickTouchId === -1) {
      // Left side → joystick
      stickTouchId = t.identifier
      stickCenterX = t.clientX
      stickCenterY = t.clientY
      stickBase.style.left = (t.clientX - STICK_RADIUS - 10) + 'px'
      stickBase.style.top  = (t.clientY - STICK_RADIUS - 10) + 'px'
      stickBase.style.opacity = '1'
      stickKnob.style.transform = 'translate(0px, 0px)'
    } else if (t.clientX >= w * 0.45 && lookTouchId === -1) {
      // Right side → camera rotation
      lookTouchId = t.identifier
      lookLastX = t.clientX
    }
  }
}

function onTouchMove(e) {
  e.preventDefault()
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]

    if (t.identifier === stickTouchId) {
      let dx = t.clientX - stickCenterX
      let dy = t.clientY - stickCenterY
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > STICK_RADIUS) {
        dx = (dx / dist) * STICK_RADIUS
        dy = (dy / dist) * STICK_RADIUS
        dist = STICK_RADIUS
      }
      stickKnob.style.transform = `translate(${dx}px, ${dy}px)`
      const norm = dist / STICK_RADIUS
      if (norm < DEAD_ZONE) {
        touchMoveX = 0
        touchMoveY = 0
      } else {
        const adjusted = (norm - DEAD_ZONE) / (1 - DEAD_ZONE)
        touchMoveX = (dx / dist) * adjusted
        touchMoveY = (dy / dist) * adjusted
      }
    }

    if (t.identifier === lookTouchId) {
      const deltaX = t.clientX - lookLastX
      lookLastX = t.clientX
      _rotAccum += -deltaX * ROTATE_SENS
    }
  }
}

function onTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]
    if (t.identifier === stickTouchId) {
      stickTouchId = -1
      touchMoveX = 0
      touchMoveY = 0
      stickBase.style.opacity = '0.4'
      stickKnob.style.transform = 'translate(0px, 0px)'
    }
    if (t.identifier === lookTouchId) {
      lookTouchId = -1
    }
  }
}
