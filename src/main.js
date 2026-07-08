// ═══════════════════════════════════════════════════════════════
// main.js — NEXUS WebZone entry point
// Orchestrates: wallet → multiplayer → avatar cache → game loop
// ═══════════════════════════════════════════════════════════════
import { avatarCache, loadPlayerAvatar } from './avatarCache.js'
import { showAvatarPicker, setupPickerSkip } from './avatarPicker.js'
import { initMultiplayer, broadcastPosition, interpolatePlayers, remoteCache, onStoreEntry, getAblyClient, getAblyChannel } from './multiplayer.js'
import { initDM, onInboxMessage } from './dmService.js'
import { initDMPanel, openDMPanel } from './dmPanel.js'
import { initGroupChat } from './groupChat.js'
import { initRenderer, renderFrame, renderThirdPerson, renderBirdsEye, drawMinimap, resolvedNPCs, initStoreAssets, setRenderSpineSlots } from './renderer.js'
import { initStoreOverlays, updateStoreOverlays } from './store-overlays.js'
import { connectRoninExtension, connectRoninMobile, connectWaypoint, shortAddress, onAccountChange, getAddress } from './wallet.js'
import { MAP, MAP_W, MAP_H, CELL_STORE, STORES, TUTORIAL_STORES, getZone } from './map.js'
import { MOUSE_SENSITIVITY } from './config.js'
import { cam, rotateCamera } from './cameraState.js'
import { initInput, updateMovement } from './inputPhysics.js'
import { initUIPanels, panelOpen, npcDialogueOpen, openNPCDialogue,
         openStore, openTutorialPanel,
         showEvent, showTradeNotif } from './uiPanelState.js'
import { maybeShowTutorialSplash, isTutorialSplashActive, dismissTutorialSplash,
         showWelcomeSplashOnce, maybeZoneSplash } from './splashEvents.js'
import { initTouch, setInteractCallback, setInteractVisible } from './touch.js'

// ── Camera state → cameraState.js (cam object; Phase 5 chunk B) ──

// ── Camera mode ───────────────────────────────────────────────
// viewMode: 'first' | 'third' | 'overhead'
let viewMode = 'first'
let selfTexture = null   // player's own avatar — loaded on enter, used for 3rd-person sprite

// ── Game state ────────────────────────────────────────────────
let _entered  = false   // guard against double-click on enter-btn
let running   = false
let t         = 0, lastTs = 0
let nearStore    = null
let nearbyStores = new Set()
let nearNPC      = null     // { id, name, ... } of closest NPC within interact range
let nearPlayer   = null     // { id } of closest remote player within DM range
// One interaction range for NPCs and players (Phase 1.7 — merged from
// NPC_INTERACT_DIST/PLAYER_INTERACT_DIST, tightened 2.5 → 1.5 per Jeremy).
const INTERACT_DIST = 1.5  // map units
// keys map + keyboard listeners + walkable() → inputPhysics.js

// ── Canvas init ───────────────────────────────────────────────
const canvas = document.getElementById('c')
const canvasCtx = canvas.getContext('2d')   // cached — never call getContext in loop
const mmCanvas = document.getElementById('mc')
initRenderer(canvas)
initTouch()
initDMPanel()
initUIPanels({ getNearNPC: () => nearNPC })
initInput({ onInteract: doInteract })

// ── Camera toggle ─────────────────────────────────────────────
const camToggleBtn = document.getElementById('cam-toggle')
const VIEW_LABELS = { first: '👁 1ST', third: '🎮 3RD', overhead: '🗺 TOP' }
camToggleBtn.addEventListener('click', () => {
  viewMode = viewMode === 'first' ? 'third' : viewMode === 'third' ? 'overhead' : 'first'
  camToggleBtn.textContent = VIEW_LABELS[viewMode]
})

// ═══════════════════════════════════════════════════════════════
// WALLET CONNECT UI
// ═══════════════════════════════════════════════════════════════
async function handleConnect(connectFn) {
  document.getElementById('wallet-disconnected').style.display = 'none'
  document.getElementById('wallet-connecting').style.display   = 'block'

  try {
    const address = await connectFn()
    document.getElementById('wallet-connecting').style.display = 'none'
    showPickerThenEnter(address)
  } catch (err) {
    document.getElementById('wallet-connecting').style.display  = 'none'
    document.getElementById('wallet-disconnected').style.display= 'block'
    alert(err.message)
  }
}

document.getElementById('connect-ext-btn').addEventListener('click', () => handleConnect(connectRoninExtension))
document.getElementById('connect-mob-btn').addEventListener('click', () => handleConnect(connectRoninMobile))
document.getElementById('connect-wp-btn').addEventListener('click', () => handleConnect(connectWaypoint))

// Watch for wallet changes (network switch, disconnect)
onAccountChange(({ address, isConnected }) => {
  if (!isConnected) {
    // Reload page on disconnect for clean state
    window.location.reload()
  }
})

// ── POST-CONNECT: show avatar picker then reveal ENTER button ─
async function showPickerThenEnter(address) {
  // Hide splash so the avatar picker (z:900) is visible
  const splash = document.getElementById('splash')
  splash.style.display = 'none'

  // showAvatarPicker returns a Promise that resolves when user clicks a card.
  // setupPickerSkip MUST receive the same resolve so "Skip" also resolves it.
  // Wrap both in a single Promise whose resolve is shared.
  const avatarUrl = await new Promise(resolve => {
    showAvatarPicker(address).then(resolve)
    setupPickerSkip(address, resolve)
  })

  // Re-show splash with only the ENTER button visible
  document.getElementById('wallet-disconnected').style.display = 'none'
  document.getElementById('wallet-connecting').style.display    = 'none'
  document.getElementById('wallet-connected').style.display     = 'block'
  document.getElementById('wallet-addr').textContent = shortAddress(address)
  splash.style.display = ''
  splash.style.opacity = '1'
}

// ── ENTER THE ZONE ────────────────────────────────────────────
document.getElementById('enter-btn').addEventListener('click', async () => {
  if (_entered) return
  _entered = true
  const splash = document.getElementById('splash')
  splash.classList.add('gone')

  // Start Spine/PIXI stack load immediately
  const spineLoadPromise = (async () => {
    const { renderAll } = await import('./spineAvatarManager.js')
    setRenderSpineSlots(renderAll)
    window.spineStackLoaded = true
  })()

  // 10 second timeout promise
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Spine/PIXI stack load timed out after 10s')), 10000)
  )

  // Wait for the fade-out transition (1s) and Spine loading (up to 10s)
  const transitionPromise = new Promise(resolve => setTimeout(resolve, 1000))

  try {
    await Promise.race([spineLoadPromise, timeoutPromise])
  } catch (err) {
    console.warn('[MAIN] Spine/PIXI stack load failed or timed out. Falling back to static/procedural avatars.', err)
  }

  // Ensure transition has completed (1s visual minimum)
  await transitionPromise

  splash.style.display = 'none'

  // Init IndexedDB
  await avatarCache.init().catch(console.warn)

  // Start multiplayer with wallet address as player ID
  const address = getAddress()
  if (address) {
    initMultiplayer(address)
    // Wire DM service — must come after initMultiplayer so ablyClient exists
    initDM(address, getAblyClient())
    // Wire group chat — getAblyChannel() is safe here: initMultiplayer(address)
    // ran above and sets ablyChannel synchronously before returning.
    initGroupChat({
      posGetter: () => ({ x: cam.x, y: cam.y }),
      myId:      address,
      channel:   getAblyChannel()
      // channelOverride omitted here — only passed for guild hall rooms
    })
    onInboxMessage(showTradeNotif)   // wire inbox toast (uiPanelState.js)
    // Load own avatar for 3rd-person selfTexture.
    // If the user picked during the picker phase the URL is already in
    // sessionStorage — bypass IDB so we always show what they actually picked.
    // If they skipped the picker, fall back to IDB cache for fast startup.
    const _selfUrl = () => sessionStorage.getItem(`avatar-url:${address}`) || null
    // isSelf=true → reserved slot 0 on the shared Spine context (spec R2 MEDIUM-3)
    loadPlayerAvatar(address, tex => { selfTexture = tex }, _selfUrl(), null, true)
    // On subsequent avatar changes (rare — avatar change while already in world):
    window.addEventListener('avatar-changed', (e) => {
      if (e.detail.address !== address) return
      selfTexture?.destroy?.()   // release old slot before re-acquiring
      loadPlayerAvatar(address, tex => { selfTexture = tex }, _selfUrl(), null, true)
    })
  }

  // Wire store-entry events from other players
  onStoreEntry((playerId, storeId) => {
    const store = STORES[storeId]
    if (store) showEvent(`#${playerId.slice(0,6).toUpperCase()} entered ${store.name}`)
  })

  // Build HTML overlay elements for store key art
  initStoreOverlays()
  // Load textures (logo baked into raycaster texture)
  initStoreAssets().catch(console.warn)

  running = true
  requestAnimationFrame(loop)
})

// ═══════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════
function doInteract() {
  if (panelOpen()) return
  if (nearNPC)         openNPCDialogue(nearNPC)
  else if (nearStore) {
    if (TUTORIAL_STORES[nearStore]) openTutorialPanel(nearStore)
    else                            openStore(nearStore)
  }
  else if (nearPlayer) openDMPanel(nearPlayer.id, shortAddress(nearPlayer.id))
}
setInteractCallback(doInteract)

// Keyboard listeners (incl. Esc close-all, T group chat) → inputPhysics.js

canvas.addEventListener('click', () => { if (running && !panelOpen()) canvas.requestPointerLock() })
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || !running || panelOpen()) return
  rotateCamera(-e.movementX * MOUSE_SENSITIVITY)
})

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
function update(dt) {
  // Turn + move + collision + escalators → inputPhysics.js
  const ml = updateMovement(dt)

  // Tutorial splash — dismiss on movement input (ml > 0 ⇔ any mx/my input)
  if (isTutorialSplashActive() && ml > 0) {
    dismissTutorialSplash()
  }

  // Multiplayer
  interpolatePlayers(dt)
  broadcastPosition(cam.x, cam.y, cam.dirX, cam.dirY)

  // Proximity to stores — scan 3-cell radius, collect ALL nearby stores
  const mapX=cam.x|0, mapY=cam.y|0
  let found = null
  nearbyStores = new Set()
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const nx = mapX + dx, ny = mapY + dy
      if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) {
        const cell = MAP[ny][nx]
        if (cell >= 10) {
          const sid = CELL_STORE[cell]
          nearbyStores.add(sid)
          if (!found) found = sid   // first found = toast target
        }
      }
    }
  }
  if (found !== nearStore) {
    nearStore = found
    const toast = document.getElementById('toast')
    if (found) { document.getElementById('tn').textContent = (STORES[found] ?? TUTORIAL_STORES[found]).name; toast.classList.add('on') }
    else toast.classList.remove('on')
    setInteractVisible(!!found || !!nearNPC, found ? 'ENTER' : nearNPC ? 'TALK' : '')
  }

  // NPC proximity
  let closestNPC = null, closestDist = INTERACT_DIST * INTERACT_DIST
  for (const npc of resolvedNPCs) {
    const d = (npc.x-cam.x)**2 + (npc.y-cam.y)**2
    if (d < closestDist) { closestDist = d; closestNPC = npc }
  }
  if (closestNPC !== nearNPC) {
    nearNPC = closestNPC
    const toast = document.getElementById('toast')
    if (nearNPC && !nearStore) {
      document.getElementById('tn').textContent = nearNPC.name
      toast.classList.add('on')
      setInteractVisible(true, 'TALK')
    } else if (!nearStore) {
      // Fix #16: NPC left range — re-evaluate whether the player toast
      // should now be shown.  Previously the toast was simply removed,
      // leaving nearPlayer in range with no toast and no interact prompt.
      if (nearPlayer) {
        document.getElementById('tn').textContent = shortAddress(nearPlayer.id)
        toast.classList.add('on')
        setInteractVisible(true, 'CHAT')
      } else {
        toast.classList.remove('on')
        setInteractVisible(false, '')
      }
    } else {
      // Store is near; NPC changed but store controls the toast label.
      setInteractVisible(true, 'ENTER')
    }
  }

  // Remote player proximity (DM trigger)
  let closestPlayer = null, closestPlayerDist = INTERACT_DIST * INTERACT_DIST
  for (const [id, p] of Object.entries(remoteCache)) {
    const d = (p.x - cam.x) ** 2 + (p.y - cam.y) ** 2
    if (d < closestPlayerDist) { closestPlayerDist = d; closestPlayer = { id } }
  }
  if (closestPlayer?.id !== nearPlayer?.id) {
    nearPlayer = closestPlayer
    if (!nearNPC && !nearStore) {
      const toast = document.getElementById('toast')
      if (nearPlayer) {
        document.getElementById('tn').textContent = shortAddress(nearPlayer.id)
        toast.classList.add('on')
      } else {
        toast.classList.remove('on')
      }
      setInteractVisible(!!nearPlayer, nearPlayer ? 'CHAT' : '')
    }
  }

  // Zone HUD
  const zone = getZone(cam.x, cam.y)

  // Tutorial splash — one-shot trigger on entering the TUTORIAL room
  // (tutorial facades line its walls). Spawn sits in MAIN_LOBBY, a
  // different zone, so it never collides with the one-time welcome
  // splash on frame 1.
  maybeShowTutorialSplash(zone.id)

  document.getElementById('hz').textContent       = zone.id
  document.getElementById('zone-lbl').textContent = zone.label !== zone.id ? zone.label : ''

  // One-time welcome splash — first update frame after Enter
  showWelcomeSplashOnce()

  // Zone-entry splash — movement-gated so it fires while walking IN, and
  // re-fires after the 2h cooldown the moment an idle player starts moving.
  // (cooldown / panel / tutorial-splash gating lives in splashEvents.js)
  if (ml > 0) maybeZoneSplash(zone.id)
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════
function loop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05)
  lastTs = ts; t += dt

  const anyPanelOpen = panelOpen() || npcDialogueOpen?.()
  if (running && !anyPanelOpen) update(dt)
  if (viewMode === 'overhead') {
    renderBirdsEye(cam.x, cam.y, cam.dirX, cam.dirY, remoteCache)
  } else if (viewMode === 'third') {
    // (3rd-person camera result renamed tpCam — `cam` is the player camera object)
    const tpCam = renderThirdPerson(cam.x, cam.y, cam.dirX, cam.dirY, cam.plX, cam.plY, t, remoteCache, nearStore, selfTexture)
    updateStoreOverlays(canvasCtx, tpCam.camX, tpCam.camY, cam.dirX, cam.dirY, cam.plX, cam.plY, anyPanelOpen ? new Set() : nearbyStores, canvas.width, canvas.height, t)
    // Draw self-avatar last — always on top of overlays
    if (tpCam.drawSelf) tpCam.drawSelf()
  } else {
    renderFrame(cam.x, cam.y, cam.dirX, cam.dirY, cam.plX, cam.plY, t, remoteCache, nearStore)
    updateStoreOverlays(canvasCtx, cam.x, cam.y, cam.dirX, cam.dirY, cam.plX, cam.plY, anyPanelOpen ? new Set() : nearbyStores, canvas.width, canvas.height, t)
  }
  drawMinimap(mmCanvas, cam.x, cam.y, cam.dirX, cam.dirY, remoteCache)

  requestAnimationFrame(loop)
}

// Panels / NPC dialogue / trade toast / event feed → uiPanelState.js
// Tutorial + zone + welcome splashes                → splashEvents.js
// (Phase 5 chunk A — mechanical extraction, zero logic changes)
