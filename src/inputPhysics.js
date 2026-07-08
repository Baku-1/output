// ═══════════════════════════════════════════════════════════════
// inputPhysics.js — keyboard state, movement physics, collision
// (Phase 5 chunk B, mechanical except cam-object access). Owns the
// private `keys` map and the keyboard listeners. Interact (F/Space)
// is injected via initInput() because doInteract reads main-owned
// proximity state. Pointer-lock mouse handlers stay in main.js
// (they need the `running` flag and canvas).
// ═══════════════════════════════════════════════════════════════
import { MAP, MAP_W, MAP_H, CELL, ESCALATORS } from './map.js'
import { MOVE_SPEED, TURN_SPEED, FOV_PLANE } from './config.js'
import { cam, rotateCamera } from './cameraState.js'
import { touchMoveX, touchMoveY, consumeRotation } from './touch.js'
import { panelOpen, npcDialogueOpen, closeStore, closeNPCDialogue, closeTutorialPanel } from './uiPanelState.js'
import { closeDMPanel } from './dmPanel.js'
import { toggleGroupChat, closeGroupChat } from './groupChat.js'

const keys = {}
let _onInteract = () => {}

export function initInput({ onInteract } = {}) {
  if (onInteract) _onInteract = onInteract
}

document.addEventListener('keydown', e => {
  keys[e.code] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
  if (e.code === 'KeyF' || e.code === 'Space') _onInteract()
  // T key — toggle group chat.
  // Guards:
  //   !panelOpen()       — don't open over store panel, DM panel, or group chat itself
  //   !npcDialogueOpen() — don't open over NPC dialogue (same screen corner, visual overlap)
  if (e.code === 'KeyT' && !panelOpen() && !npcDialogueOpen()) {
    e.preventDefault()
    toggleGroupChat()
  }
  if (e.code === 'Escape') { closeStore(); closeNPCDialogue(); closeDMPanel(); closeGroupChat(); closeTutorialPanel() }
})
document.addEventListener('keyup', e => { keys[e.code] = false })

// ── Collision ─────────────────────────────────────────────────
export function walkable(x, y) {
  const mx=x|0, my=y|0
  if (mx<0||mx>=MAP_W||my<0||my>=MAP_H) return false
  return MAP[my][mx] === CELL.FLOOR
}

// ── Per-frame turn + movement. Mutates cam in place. ─────────
// Returns the movement-input magnitude ml (0 = no movement input
// this frame) — main's update loop uses it for splash gating.
export function updateMovement(dt) {
  // Turn — keyboard + touch rotation
  if (keys['KeyQ'] || keys['ArrowLeft'])  rotateCamera(-TURN_SPEED * dt)
  if (keys['KeyE'] || keys['ArrowRight']) rotateCamera( TURN_SPEED * dt)
  const touchRot = consumeRotation()
  if (touchRot !== 0) rotateCamera(touchRot)

  // Move — keyboard + touch joystick
  let mx=0, my=0
  const s=cam.plX/FOV_PLANE, sy=cam.plY/FOV_PLANE
  if (keys['KeyW']||keys['ArrowUp'])   { mx+=cam.dirX; my+=cam.dirY }
  if (keys['KeyS']||keys['ArrowDown']) { mx-=cam.dirX; my-=cam.dirY }
  if (keys['KeyA']) { mx-=s; my-=sy }
  if (keys['KeyD']) { mx+=s; my+=sy }
  // Touch joystick: touchMoveY<0 = up = forward, touchMoveX = strafe
  if (touchMoveX || touchMoveY) {
    mx += cam.dirX * (-touchMoveY) + s  * touchMoveX
    my += cam.dirY * (-touchMoveY) + sy * touchMoveX
  }

  const ml = Math.sqrt(mx*mx + my*my)
  if (ml > 0) {
    const spd=MOVE_SPEED*dt, nx=cam.x+(mx/ml)*spd, ny=cam.y+(my/ml)*spd
    if (walkable(nx, cam.y)) cam.x = nx
    if (walkable(cam.x, ny)) cam.y = ny

    // Escalators — walking onto a pad teleports to the paired exit on the
    // other level (exits sit beside destination pads, so no re-trigger loop).
    for (const e of ESCALATORS) {
      if (cam.x >= e.pad.x0 && cam.x < e.pad.x1 + 1 &&
          cam.y >= e.pad.y0 && cam.y < e.pad.y1 + 1) {
        cam.x = e.exit.x; cam.y = e.exit.y
        break
      }
    }
  }
  return ml
}
