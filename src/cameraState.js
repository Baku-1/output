// ═══════════════════════════════════════════════════════════════
// cameraState.js — single owner of the camera/player transform
// (Phase 5 chunk B). A mutable object instead of module-level lets:
// ES module bindings aren't writable by importers, object props are.
// Renderer functions keep scalar params — callers pass cam.x, cam.y…
// ═══════════════════════════════════════════════════════════════
import { SPAWN } from './map.js'
import { FOV_PLANE } from './config.js'

export const cam = {
  x:    SPAWN.x,   // spawn: MAIN LOBBY, facing the promenade
  y:    SPAWN.y,
  dirX: 0,
  dirY: -1,
  plX:  FOV_PLANE,
  plY:  0,
}

export function rotateCamera(a) {
  const ca=Math.cos(a), sa=Math.sin(a), od=cam.dirX, op=cam.plX
  cam.dirX=cam.dirX*ca-cam.dirY*sa; cam.dirY=od*sa+cam.dirY*ca
  cam.plX=cam.plX*ca-cam.plY*sa;    cam.plY=op*sa+cam.plY*ca
}
