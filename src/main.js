// ═══════════════════════════════════════════════════════════════
// main.js — NEXUS WebZone entry point
// Orchestrates: wallet → multiplayer → avatar cache → game loop
// ═══════════════════════════════════════════════════════════════
import { avatarCache, loadPlayerAvatar } from './avatarCache.js'
import { showAvatarPicker, setupPickerSkip } from './avatarPicker.js'
import { initMultiplayer, broadcastPosition, interpolatePlayers, remoteCache, onStoreEntry, broadcastStoreEntry } from './multiplayer.js'
import { initRenderer, renderFrame, renderBirdsEye, drawMinimap, hexRGB, resolvedNPCs, initStoreAssets } from './renderer.js'
import { initStoreOverlays, updateStoreOverlays } from './store-overlays.js'
import { connectRoninExtension, connectRoninMobile, connectWaypoint, shortAddress, onAccountChange } from './wallet.js'
import { MAP, MAP_W, MAP_H, CELL, CELL_STORE, STORES, getZone } from './map.js'
import { MOVE_SPEED, TURN_SPEED, MOUSE_SENSITIVITY, FOV_PLANE } from './config.js'

// ── Camera state ──────────────────────────────────────────────
let posX=21.5, posY=53.5, dirX=0, dirY=-1
let plX=FOV_PLANE, plY=0

// ── Camera mode ───────────────────────────────────────────────
let isBirdsEye = false

// ── Game state ────────────────────────────────────────────────
let running   = false
let t         = 0, lastTs = 0
let nearStore    = null
let nearbyStores = new Set()
let nearNPC      = null     // { id, name, ... } of closest NPC within interact range
const NPC_INTERACT_DIST = 2.5  // map units
const keys    = {}

// ── Canvas init ───────────────────────────────────────────────
const canvas = document.getElementById('c')
const mmCanvas = document.getElementById('mc')
initRenderer(canvas)

// ── Camera toggle ─────────────────────────────────────────────
const camToggleBtn = document.getElementById('cam-toggle')
camToggleBtn.addEventListener('click', () => {
  isBirdsEye = !isBirdsEye
  camToggleBtn.textContent = isBirdsEye ? '🗺 3RD' : '👁 1ST'
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
  const splash = document.getElementById('splash')
  splash.classList.add('gone')
  setTimeout(async () => {
    splash.style.display = 'none'

    // Init IndexedDB
    await avatarCache.init().catch(console.warn)

    // Start multiplayer with wallet address as player ID
    const { getAddress } = await import('./wallet.js')
    const address = getAddress()
    if (address) {
      initMultiplayer(address)
      // Load own avatar (self-preview — optional, for future name tag feature)
      loadPlayerAvatar(address, () => {})
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
  }, 1000)
})

// ═══════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  keys[e.code] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
  if ((e.code === 'KeyF' || e.code === 'Space') && !panelOpen()) {
    if (nearNPC)   openNPCDialogue(nearNPC)
    else if (nearStore) openStore(nearStore)
  }
  if (e.code === 'Escape') { closeStore(); closeNPCDialogue() }
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
  // Turn
  if (keys['KeyQ'] || keys['ArrowLeft'])  rotateCamera(-TURN_SPEED * dt)
  if (keys['KeyE'] || keys['ArrowRight']) rotateCamera( TURN_SPEED * dt)

  // Move
  let mx=0, my=0
  const s=plX/FOV_PLANE, sy=plY/FOV_PLANE
  if (keys['KeyW']||keys['ArrowUp'])   { mx+=dirX; my+=dirY }
  if (keys['KeyS']||keys['ArrowDown']) { mx-=dirX; my-=dirY }
  if (keys['KeyA']) { mx-=s; my-=sy }
  if (keys['KeyD']) { mx+=s; my+=sy }

  const ml = Math.sqrt(mx*mx + my*my)
  if (ml > 0) {
    const spd=MOVE_SPEED*dt, nx=posX+(mx/ml)*spd, ny=posY+(my/ml)*spd
    if (walkable(nx, posY)) posX = nx
    if (walkable(posX, ny)) posY = ny
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
    if (found) { document.getElementById('tn').textContent = STORES[found].name; toast.classList.add('on') }
    else toast.classList.remove('on')
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
    } else if (!nearStore) {
      toast.classList.remove('on')
    }
  }

  // Zone HUD
  const zone = getZone(posX, posY)
  document.getElementById('hz').textContent       = zone.id
  document.getElementById('zone-lbl').textContent = zone.label !== zone.id ? zone.label : ''
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════
function loop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05)
  lastTs = ts; t += dt

  const anyPanelOpen = panelOpen() || npcDialogueOpen?.()
  if (running && !anyPanelOpen) update(dt)
  if (isBirdsEye) {
    renderBirdsEye(posX, posY, dirX, dirY, remoteCache)
  } else {
    renderFrame(posX, posY, dirX, dirY, plX, plY, t, remoteCache, nearStore)
    updateStoreOverlays(canvas.getContext('2d'), posX, posY, dirX, dirY, plX, plY, anyPanelOpen ? new Set() : nearbyStores, canvas.width, canvas.height, t)
  }
  drawMinimap(mmCanvas, posX, posY, dirX, dirY, remoteCache)

  requestAnimationFrame(loop)
}

// ═══════════════════════════════════════════════════════════════
// STORE PANEL
// ═══════════════════════════════════════════════════════════════
function panelOpen() { return document.getElementById('sp').classList.contains('on') }
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: activeNPC.systemPrompt,
        messages: npcHistories[activeNPC.id],
      })
    })
    const d = await res.json()
    const reply = d.content?.find(b => b.type==='text')?.text || '...'
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

// ── Event feed (store entries from other players) ─────────────
let _eventTimer = null
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
// AI GUIDE
// ═══════════════════════════════════════════════════════════════
// NOTE: In production, proxy this through your own backend so the
// Anthropic API key is never exposed in client-side code.
const GUIDE_SYS = `You are the guide inside The Outlet — the world's first WebZone game mall. A 3D digital environment where visitors roam storefronts for Web3 and Web2 games. Built with a DDA raycaster and Supabase Realtime multiplayer.

Mall layout:
- LOBBY → MAIN HALL (Decentraland, Splinterlands) → FOOD COURT → three wings
- BATTLE WING (north): Axie Infinity, Gods Unchained
- RPG WING (west): Illuvium, Big Time
- STRATEGY WING (east): The Sandbox, Star Atlas

Controls: W/S=move, A/D=strafe, Q/E=turn, mouse look, F=enter store near you.
2-3 sentences max. Help visitors find the right game for their taste.`

let gHist=[], gLoad=false

async function sendGuide() {
  const inp=document.getElementById('gi'), msg=inp.value.trim()
  if (!msg || gLoad) return
  inp.value = ''
  addGM(msg, 'usr')
  gHist.push({ role:'user', content:msg })
  gLoad = true
  const ld = addGM('…', 'ld')
  try {
    // TODO: replace direct API call with your proxied backend route
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:GUIDE_SYS, messages:gHist })
    })
    const d = await res.json()
    const reply = d.content?.find(b=>b.type==='text')?.text || 'Try again.'
    ld.remove(); addGM(reply, 'bot')
    gHist.push({ role:'assistant', content:reply })
  } catch { ld.remove(); addGM('Signal lost. Try again.', 'bot') }
  gLoad = false
}

function addGM(text, cls) {
  const el = document.createElement('div')
  el.className = `gm ${cls}`; el.textContent = text
  const msgs = document.getElementById('gmsgs')
  msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight
  return el
}

document.getElementById('gsend').addEventListener('click', sendGuide)
document.getElementById('gi').addEventListener('keydown', e => { if (e.key==='Enter') sendGuide() })
document.getElementById('npc-send').addEventListener('click', sendNPCMessage)
document.getElementById('npc-input').addEventListener('keydown', e => { if (e.key==='Enter') sendNPCMessage() })
