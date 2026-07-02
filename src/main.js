// ═══════════════════════════════════════════════════════════════
// main.js — NEXUS WebZone entry point
// Orchestrates: wallet → multiplayer → avatar cache → game loop
// ═══════════════════════════════════════════════════════════════
import { avatarCache, loadPlayerAvatar } from './avatarCache.js'
import { showAvatarPicker, setupPickerSkip } from './avatarPicker.js'
import { initMultiplayer, broadcastPosition, interpolatePlayers, remoteCache, onStoreEntry, broadcastStoreEntry, getAblyClient, getAblyChannel } from './multiplayer.js'
import { initDM, onInboxMessage } from './dmService.js'
import { initDMPanel, openDMPanel, closeDMPanel, isDMPanelOpen, getOpenPeerAddr } from './dmPanel.js'
import { initGroupChat, toggleGroupChat, closeGroupChat, isGroupChatOpen } from './groupChat.js'
import { initRenderer, renderFrame, renderThirdPerson, renderBirdsEye, drawMinimap, hexRGB, resolvedNPCs, initStoreAssets, setRenderSpineSlots } from './renderer.js'
import { initStoreOverlays, updateStoreOverlays } from './store-overlays.js'
import { connectRoninExtension, connectRoninMobile, connectWaypoint, shortAddress, onAccountChange, getAddress } from './wallet.js'
import { MAP, MAP_W, MAP_H, CELL, CELL_STORE, STORES, TUTORIAL_STORES, ZONE_SPLASH, getZone, ESCALATORS, SPAWN } from './map.js'
import { MOVE_SPEED, TURN_SPEED, MOUSE_SENSITIVITY, FOV_PLANE, GROQ_MODEL } from './config.js'
import { initTouch, isTouchDevice, touchMoveX, touchMoveY, consumeRotation, setInteractCallback, setInteractVisible } from './touch.js'

// ── Camera state ──────────────────────────────────────────────
let posX=SPAWN.x, posY=SPAWN.y, dirX=0, dirY=-1   // spawn: MAIN LOBBY, facing the promenade
let plX=FOV_PLANE, plY=0

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
const NPC_INTERACT_DIST    = 2.5  // map units
const PLAYER_INTERACT_DIST = 2.5  // map units
const keys    = {}

// ── Canvas init ───────────────────────────────────────────────
const canvas = document.getElementById('c')
const canvasCtx = canvas.getContext('2d')   // cached — never call getContext in loop
const mmCanvas = document.getElementById('mc')
initRenderer(canvas)
initTouch()
initDMPanel()

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
    console.log('[MAIN] wallet connected with address:', address)
    console.log('[MAIN] calling showPickerThenEnter()')
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
      posGetter: () => ({ x: posX, y: posY }),
      myId:      address,
      channel:   getAblyChannel()
      // channelOverride omitted here — only passed for guild hall rooms
    })
    onInboxMessage(_showTradeNotif)   // wire inbox toast
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

document.addEventListener('keydown', e => {
  keys[e.code] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
  if (e.code === 'KeyF' || e.code === 'Space') doInteract()
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

canvas.addEventListener('click', () => { if (running && !panelOpen()) canvas.requestPointerLock() })
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || !running || panelOpen()) return
  rotateCamera(-e.movementX * MOUSE_SENSITIVITY)
})

function rotateCamera(a) {
  const ca=Math.cos(a), sa=Math.sin(a), od=dirX, op=plX
  dirX=dirX*ca-dirY*sa; dirY=od*sa+dirY*ca
  plX=plX*ca-plY*sa;    plY=op*sa+plY*ca
}

// ═══════════════════════════════════════════════════════════════
// COLLISION
// ═══════════════════════════════════════════════════════════════
function walkable(x, y) {
  const mx=x|0, my=y|0
  if (mx<0||mx>=MAP_W||my<0||my>=MAP_H) return false
  return MAP[my][mx] === CELL.FLOOR
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════
function update(dt) {
  // Turn — keyboard + touch rotation
  if (keys['KeyQ'] || keys['ArrowLeft'])  rotateCamera(-TURN_SPEED * dt)
  if (keys['KeyE'] || keys['ArrowRight']) rotateCamera( TURN_SPEED * dt)
  const touchRot = consumeRotation()
  if (touchRot !== 0) rotateCamera(touchRot)

  // Move — keyboard + touch joystick
  let mx=0, my=0
  const s=plX/FOV_PLANE, sy=plY/FOV_PLANE
  if (keys['KeyW']||keys['ArrowUp'])   { mx+=dirX; my+=dirY }
  if (keys['KeyS']||keys['ArrowDown']) { mx-=dirX; my-=dirY }
  if (keys['KeyA']) { mx-=s; my-=sy }
  if (keys['KeyD']) { mx+=s; my+=sy }
  // Touch joystick: touchMoveY<0 = up = forward, touchMoveX = strafe
  if (touchMoveX || touchMoveY) {
    mx += dirX * (-touchMoveY) + s  * touchMoveX
    my += dirY * (-touchMoveY) + sy * touchMoveX
  }

  const ml = Math.sqrt(mx*mx + my*my)
  if (ml > 0) {
    const spd=MOVE_SPEED*dt, nx=posX+(mx/ml)*spd, ny=posY+(my/ml)*spd
    if (walkable(nx, posY)) posX = nx
    if (walkable(posX, ny)) posY = ny

    // Escalators — walking onto a pad teleports to the paired exit on the
    // other level (exits sit beside destination pads, so no re-trigger loop).
    for (const e of ESCALATORS) {
      if (posX >= e.pad.x0 && posX < e.pad.x1 + 1 &&
          posY >= e.pad.y0 && posY < e.pad.y1 + 1) {
        posX = e.exit.x; posY = e.exit.y
        break
      }
    }
  }

  // Tutorial splash — dismiss on movement input
  if (_tutorialSplashActive && (Math.abs(mx) > 0 || Math.abs(my) > 0)) {
    _dismissTutorialSplash()
  }

  // Multiplayer
  interpolatePlayers(dt)
  broadcastPosition(posX, posY, dirX, dirY)

  // Proximity to stores — scan 3-cell radius, collect ALL nearby stores
  const mapX=posX|0, mapY=posY|0
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
  let closestNPC = null, closestDist = NPC_INTERACT_DIST * NPC_INTERACT_DIST
  for (const npc of resolvedNPCs) {
    const d = (npc.x-posX)**2 + (npc.y-posY)**2
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
  let closestPlayer = null, closestPlayerDist = PLAYER_INTERACT_DIST * PLAYER_INTERACT_DIST
  for (const [id, p] of Object.entries(remoteCache)) {
    const d = (p.x - posX) ** 2 + (p.y - posY) ** 2
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
  const zone = getZone(posX, posY)

  // Tutorial splash — one-shot trigger on entering the TUTORIAL room
  // (tutorial facades line its walls). Spawn sits in MAIN_LOBBY, a
  // different zone, so it never collides with the one-time welcome
  // splash on frame 1.
  if (!_tutorialSplashShown && zone.id === 'TUTORIAL') {
    _tutorialSplashShown = true
    _showTutorialSplash()
  }

  document.getElementById('hz').textContent       = zone.id
  document.getElementById('zone-lbl').textContent = zone.label !== zone.id ? zone.label : ''

  // One-time welcome splash — first update frame after Enter
  if (!_welcomeShown) {
    _welcomeShown = true
    _showWelcomeSplash()
  }

  // Zone-entry splash — movement-gated so it fires while walking IN, and
  // re-fires after the 2h cooldown the moment an idle player starts moving.
  if (ml > 0) {
    const cfg = ZONE_SPLASH[zone.id]
    const nowMs = Date.now()
    if (cfg && nowMs - (_zoneSplashLast[zone.id] ?? -Infinity) > ZONE_SPLASH_COOLDOWN
            && !panelOpen() && !_tutorialSplashActive) {
      _zoneSplashLast[zone.id] = nowMs
      _showZoneSplash(cfg)
    }
  }
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
    renderBirdsEye(posX, posY, dirX, dirY, remoteCache)
  } else if (viewMode === 'third') {
    const cam = renderThirdPerson(posX, posY, dirX, dirY, plX, plY, t, remoteCache, nearStore, selfTexture)
    updateStoreOverlays(canvasCtx, cam.camX, cam.camY, dirX, dirY, plX, plY, anyPanelOpen ? new Set() : nearbyStores, canvas.width, canvas.height, t)
    // Draw self-avatar last — always on top of overlays
    if (cam.drawSelf) cam.drawSelf()
  } else {
    renderFrame(posX, posY, dirX, dirY, plX, plY, t, remoteCache, nearStore)
    updateStoreOverlays(canvasCtx, posX, posY, dirX, dirY, plX, plY, anyPanelOpen ? new Set() : nearbyStores, canvas.width, canvas.height, t)
  }
  drawMinimap(mmCanvas, posX, posY, dirX, dirY, remoteCache)

  requestAnimationFrame(loop)
}

// ═══════════════════════════════════════════════════════════════
// STORE PANEL
// ═══════════════════════════════════════════════════════════════
function panelOpen() {
  return document.getElementById('sp').classList.contains('on')
      || document.getElementById('tutorial-panel').classList.contains('on')
      || isDMPanelOpen()
      || isGroupChatOpen()
}
function npcDialogueOpen() { return document.getElementById('npc-dialogue').classList.contains('on') }

// ── NPC Dialogue ───────────────────────────────────────────────
const npcHistories = {}

function openNPCDialogue(npc) {
  const el = document.getElementById('npc-dialogue')
  if (!el) return
  document.getElementById('npc-name').textContent  = npc.name
  document.getElementById('npc-title').textContent = npc.title
  const msgs = document.getElementById('npc-msgs')
  msgs.innerHTML = ''
  if (!npcHistories[npc.id]) {
    npcHistories[npc.id] = []
    addNPCMsg(npc.greeting, 'bot')
  } else {
    npcHistories[npc.id].forEach(m =>
      addNPCMsg(m.content, m.role === 'user' ? 'usr' : 'bot')
    )
  }
  el.classList.add('on')
  document.exitPointerLock()
  document.getElementById('npc-input').focus()
}

function closeNPCDialogue() {
  document.getElementById('npc-dialogue')?.classList.remove('on')
}

let npcLoad = false
async function sendNPCMessage() {
  const activeNPC = nearNPC || resolvedNPCs[0]
  if (!activeNPC || npcLoad) return
  const inp = document.getElementById('npc-input')
  const msg = inp.value.trim()
  if (!msg) return
  inp.value = ''
  if (!npcHistories[activeNPC.id]) npcHistories[activeNPC.id] = []
  addNPCMsg(msg, 'usr')
  npcHistories[activeNPC.id].push({ role: 'user', content: msg })
  npcLoad = true
  const ld = addNPCMsg('…', 'ld')
  try {
    // Proxied: vite dev proxy in dev, api/npc-chat.js on Vercel in prod.
    // The Groq key lives server-side only — never in the client bundle.
    const res = await fetch('/api/npc-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 200,
        temperature: 0.7,
        messages: [{ role:'system', content: activeNPC.systemPrompt }, ...npcHistories[activeNPC.id]],
      })
    })
    const d = await res.json()
    const reply = d.choices?.[0]?.message?.content || '...'
    ld.remove(); addNPCMsg(reply, 'bot')
    npcHistories[activeNPC.id].push({ role: 'assistant', content: reply })
  } catch { ld.remove(); addNPCMsg('Radio static. Try again.', 'bot') }
  npcLoad = false
}

function addNPCMsg(text, cls) {
  const el = document.createElement('div')
  el.className = `gm ${cls}`; el.textContent = text
  const msgs = document.getElementById('npc-msgs')
  msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight
  return el
}

// ── Trade offer toast (inbox notification) ───────────────────
function _ensureTradeNotif() {
  if (_tradeNotifEl) return _tradeNotifEl
  const el = document.createElement('div')
  el.id = 'trade-notif'
  // Use DOM construction, not innerHTML, to match existing security posture
  const textSpan = document.createElement('span')
  textSpan.id = 'tn-text'
  const hintSpan = document.createElement('span')
  hintSpan.id = 'tn-hint'
  hintSpan.textContent = 'Press Esc to view'
  const dismissBtn = document.createElement('button')
  dismissBtn.id = 'tn-dismiss'
  dismissBtn.title = 'Dismiss'
  dismissBtn.textContent = 'x'
  el.appendChild(textSpan)
  el.appendChild(hintSpan)
  el.appendChild(dismissBtn)
  document.body.appendChild(el)

  el.addEventListener('click', (e) => {
    if (e.target.id === 'tn-dismiss') { _dismissTradeNotif(); return }
    const from = el.dataset.from
    if (from) { _dismissTradeNotif(); openDMPanel(from, shortAddress(from)) }
  })

  _tradeNotifEl = el
  return el
}

function _showTradeNotif(notification) {
  // Suppress if the DM panel is already open with this sender
  if (isDMPanelOpen() && getOpenPeerAddr() === notification.from) return

  const el = _ensureTradeNotif()
  el.dataset.from = notification.from
  document.getElementById('tn-text').textContent =
    '[bell] Trade offer from ' + shortAddress(notification.from) +
    (notification.summary ? ' -- ' + notification.summary : '')

  el.classList.add('on')
  _tradeNotifActive = true
  clearTimeout(_tradeNotifTimer)
  // Only start timer if pointer is not locked (Finding 6)
  if (!document.pointerLockElement) {
    _tradeNotifTimer = setTimeout(_dismissTradeNotif, 8000)
  }
}

function _dismissTradeNotif() {
  _tradeNotifEl?.classList.remove('on')
  _tradeNotifActive = false
  clearTimeout(_tradeNotifTimer)
  _tradeNotifTimer = null
}

// Finding 6: pause auto-dismiss while pointer is locked; restart on release
document.addEventListener('pointerlockchange', () => {
  if (!_tradeNotifActive) return
  if (document.pointerLockElement) {
    clearTimeout(_tradeNotifTimer)
    _tradeNotifTimer = null
  } else {
    clearTimeout(_tradeNotifTimer)
    _tradeNotifTimer = setTimeout(_dismissTradeNotif, 8000)
  }
})

// ── Event feed (store entries from other players) ─────────────
let _eventTimer = null
let _tradeNotifEl     = null
let _tradeNotifTimer  = null
let _tradeNotifActive = false   // true while a notification is displayed
function showEvent(msg) {
  const el = document.getElementById('event-feed')
  if (!el) return
  el.textContent = msg
  el.classList.add('on')
  clearTimeout(_eventTimer)
  _eventTimer = setTimeout(() => el.classList.remove('on'), 4000)
}

function openStore(id) {
  const s = STORES[id]; if (!s) return
  const [r,g,b] = hexRGB(s.hex)
  document.getElementById('spc').style.setProperty('--c',  s.hex)
  document.getElementById('spc').style.setProperty('--cg', `rgba(${r},${g},${b},.11)`)
  document.getElementById('sn').textContent    = s.name
  document.getElementById('sn').style.color    = s.hex
  document.getElementById('spbg').textContent  = s.name
  document.getElementById('spbg').style.color  = s.hex
  document.getElementById('sdesc').textContent = s.desc
  document.getElementById('schain').textContent= s.chain
  document.getElementById('spl').textContent   = s.players
  document.getElementById('scost').textContent = s.cost
  document.getElementById('scta').href         = s.url
  document.getElementById('scta').style.background = s.hex
  document.getElementById('stags').innerHTML   =
    `<span class="stag">${s.genre}</span><span class="stag">${s.wing}</span><span class="stag">${s.chain}</span>`
  // Show banner image in preview area if available
  const bannerEl = document.getElementById('sp-banner-img')
  if (bannerEl) {
    if (s.assets?.banner) {
      bannerEl.src   = s.assets.banner
      bannerEl.style.display = 'block'
      document.getElementById('spbg').style.display = 'none'
    } else {
      bannerEl.style.display = 'none'
      document.getElementById('spbg').style.display = ''
    }
  }

  document.getElementById('sp').classList.add('on')
  document.exitPointerLock()
  broadcastStoreEntry(id)
}

function closeStore() { document.getElementById('sp').classList.remove('on') }
document.getElementById('spx').addEventListener('click', closeStore)
document.getElementById('sp').addEventListener('click', function(e) { if (e.target===this) closeStore() })

// ═══════════════════════════════════════════════════════════════
// TUTORIAL storefronts (Grand Lobby walls) — panel + splash
// ═══════════════════════════════════════════════════════════════
function openTutorialPanel(id) {
  const store = TUTORIAL_STORES[id]; if (!store) return
  document.getElementById('tp-title').textContent = store.name

  const stepsEl = document.getElementById('tp-steps')
  stepsEl.innerHTML = ''
  store.steps.forEach((step, i) => {
    const div = document.createElement('div')
    div.className = 'tp-step'
    const h3 = document.createElement('h3')
    h3.textContent = `${i + 1}. ${step.heading}`
    const p  = document.createElement('p')
    p.textContent = step.body
    div.appendChild(h3); div.appendChild(p)
    stepsEl.appendChild(div)
  })

  document.getElementById('tutorial-panel').classList.add('on')
  document.exitPointerLock()
  // No broadcastStoreEntry() — tutorial visits are private
}

function closeTutorialPanel() {
  document.getElementById('tutorial-panel').classList.remove('on')
}

document.getElementById('tutorial-panel').addEventListener('click', function(e) {
  if (e.target === this) closeTutorialPanel()
})
document.getElementById('tp-close').addEventListener('click', closeTutorialPanel)

// ── Splash popup — one-shot "TUTORIALS" hint in the Grand Lobby south half ──
let _tutorialSplashShown  = false
let _tutorialSplashEl     = null
let _tutorialSplashTimer  = null
let _tutorialSplashActive = false

function _ensureTutorialSplash() {
  if (_tutorialSplashEl) return _tutorialSplashEl
  const el = document.createElement('div')
  el.id = 'tutorial-splash'
  const heading  = document.createElement('div'); heading.id = 'ts-heading'
  const subtitle = document.createElement('div'); subtitle.id = 'ts-subtitle'
  heading.textContent  = 'TUTORIALS'
  subtitle.textContent = 'Five interactive guides ahead  →'
  el.appendChild(heading); el.appendChild(subtitle)
  document.body.appendChild(el)
  el.addEventListener('click', _dismissTutorialSplash)
  _tutorialSplashEl = el
  return el
}

function _showTutorialSplash() {
  if (panelOpen()) return   // don't overlay a modal that's already open
  const el = _ensureTutorialSplash()
  el.classList.add('on')
  _tutorialSplashActive = true
  clearTimeout(_tutorialSplashTimer)
  _tutorialSplashTimer = setTimeout(_dismissTutorialSplash, 4000)
}

function _dismissTutorialSplash() {
  _tutorialSplashEl?.classList.remove('on')
  _tutorialSplashActive = false
  clearTimeout(_tutorialSplashTimer)
  _tutorialSplashTimer = null
}

// ═══════════════════════════════════════════════════════════════
// ZONE-ENTRY SPLASH — 5s hall announcement (spec R2 amendment 1)
// ═══════════════════════════════════════════════════════════════
const ZONE_SPLASH_MS       = 5000
const ZONE_SPLASH_COOLDOWN = 2 * 60 * 60 * 1000   // 2h per-zone re-show
const _zoneSplashLast = {}   // zone.id → Date.now() last shown
let _zoneSplashEl    = null
let _zoneSplashTimer = null
let _welcomeShown    = false

function _ensureZoneSplash() {
  if (_zoneSplashEl) return _zoneSplashEl
  const el = document.createElement('div')
  el.id = 'zone-splash'
  const title = document.createElement('div'); title.id = 'zs-title'
  const sub   = document.createElement('div'); sub.id = 'zs-sub'
  el.appendChild(title); el.appendChild(sub)
  document.body.appendChild(el)
  el.addEventListener('click', _dismissZoneSplash)
  _zoneSplashEl = el
  return el
}

function _showZoneSplash(cfg) {
  const el = _ensureZoneSplash()
  el.classList.remove('welcome')
  document.getElementById('zs-title').textContent = cfg.title
  document.getElementById('zs-sub').textContent   = cfg.sub
  el.classList.add('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = setTimeout(_dismissZoneSplash, ZONE_SPLASH_MS)
}

// Welcome splash — THE OUTLET logo treatment, once per session on spawn
function _showWelcomeSplash() {
  const el = _ensureZoneSplash()
  el.classList.add('welcome')
  const title = document.getElementById('zs-title')
  title.textContent = ''
  const the = document.createElement('span'); the.className = 'zs-the'; the.textContent = 'THE '
  const out = document.createElement('span'); out.className = 'zs-out'; out.textContent = 'OUTLET'
  title.appendChild(the); title.appendChild(out)
  document.getElementById('zs-sub').textContent = 'WebZone 001 · Welcome to the mall'
  el.classList.add('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = setTimeout(_dismissZoneSplash, ZONE_SPLASH_MS)
}

function _dismissZoneSplash() {
  _zoneSplashEl?.classList.remove('on')
  clearTimeout(_zoneSplashTimer)
  _zoneSplashTimer = null
}

document.getElementById('npc-send').addEventListener('click', sendNPCMessage)
document.getElementById('npc-input').addEventListener('keydown', e => { if (e.key==='Enter') { sendNPCMessage() } e.stopPropagation() })
