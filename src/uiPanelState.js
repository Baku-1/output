// ═══════════════════════════════════════════════════════════════
// uiPanelState.js — panels, NPC dialogue, trade toast, event feed
// Extracted from main.js (Phase 5, mechanical). All DOM/timers private.
// main.js injects getNearNPC via initUIPanels() so NPC-proximity state
// keeps a single owner (main's update loop).
// ═══════════════════════════════════════════════════════════════
import { STORES, TUTORIAL_STORES } from './map.js'
import { GROQ_MODEL } from './config.js'
import { hexRGB, resolvedNPCs } from './renderer.js'
import { broadcastStoreEntry } from './multiplayer.js'
import { openDMPanel, isDMPanelOpen, getOpenPeerAddr } from './dmPanel.js'
import { isGroupChatOpen } from './groupChat.js'
import { shortAddress } from './wallet.js'

let _getNearNPC = () => null

export function initUIPanels({ getNearNPC } = {}) {
  if (getNearNPC) _getNearNPC = getNearNPC
}

// ═══════════════════════════════════════════════════════════════
// PANEL STATE QUERIES
// ═══════════════════════════════════════════════════════════════
export function panelOpen() {
  return document.getElementById('sp').classList.contains('on')
      || document.getElementById('tutorial-panel').classList.contains('on')
      || isDMPanelOpen()
      || isGroupChatOpen()
}
export function npcDialogueOpen() { return document.getElementById('npc-dialogue').classList.contains('on') }

// ── NPC Dialogue ───────────────────────────────────────────────
const npcHistories = {}

export function openNPCDialogue(npc) {
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

export function closeNPCDialogue() {
  document.getElementById('npc-dialogue')?.classList.remove('on')
}

let npcLoad = false
async function sendNPCMessage() {
  const activeNPC = _getNearNPC() || resolvedNPCs[0]
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
let _tradeNotifEl     = null
let _tradeNotifTimer  = null
let _tradeNotifActive = false   // true while a notification is displayed

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

export function showTradeNotif(notification) {
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
export function showEvent(msg) {
  const el = document.getElementById('event-feed')
  if (!el) return
  el.textContent = msg
  el.classList.add('on')
  clearTimeout(_eventTimer)
  _eventTimer = setTimeout(() => el.classList.remove('on'), 4000)
}

// ═══════════════════════════════════════════════════════════════
// STORE PANEL
// ═══════════════════════════════════════════════════════════════
export function openStore(id) {
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

export function closeStore() { document.getElementById('sp').classList.remove('on') }
document.getElementById('spx').addEventListener('click', closeStore)
document.getElementById('sp').addEventListener('click', function(e) { if (e.target===this) closeStore() })

// ═══════════════════════════════════════════════════════════════
// TUTORIAL storefronts (Grand Lobby walls) — panel
// ═══════════════════════════════════════════════════════════════
export function openTutorialPanel(id) {
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

export function closeTutorialPanel() {
  document.getElementById('tutorial-panel').classList.remove('on')
}

document.getElementById('tutorial-panel').addEventListener('click', function(e) {
  if (e.target === this) closeTutorialPanel()
})
document.getElementById('tp-close').addEventListener('click', closeTutorialPanel)

// ── NPC dialogue input wiring ──────────────────────────────────
document.getElementById('npc-send').addEventListener('click', sendNPCMessage)
document.getElementById('npc-input').addEventListener('keydown', e => { if (e.key==='Enter') { sendNPCMessage() } e.stopPropagation() })
