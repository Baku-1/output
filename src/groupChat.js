// ═══════════════════════════════════════════════════════════════
// groupChat.js — Proximity-based group text chat (3×3 tile cluster)
// The Outlet — WebZone 001
//
// All clients share one Ably channel (the multiplayer channel) and
// publish/subscribe on a new 'chat' event. Each receiver decides
// locally whether to render an incoming message based on whether the
// sender's snapshot position is within RANGE tiles of the receiver's
// current position. No channel churn, no join/leave lifecycle.
//
// See pipeline/01-architect/group-chat-spec.md for full design rationale.
// ═══════════════════════════════════════════════════════════════

import { shortAddress } from './wallet.js'
import { isTouchDevice } from './touch.js'

// ── Module-private state ─────────────────────────────────────────
let _panel      = null        // #group-chat DOM element
let _msgList    = null        // #gc-msgs DOM element
let _input      = null        // #gc-input DOM element
let _open       = false       // panel visibility state
let _posGetter  = null        // () => { x: number, y: number }
let _myId       = null        // local player wallet address (lowercase)
let _channel    = null        // active Ably channel (may be channelOverride)
const _messages = []          // MessageRecord[] — full session history (bounded to MAX_MSGS)
const MAX_MSGS  = 20          // how many messages to keep (oldest dropped from array AND DOM)
const MAX_LEN   = 200         // character cap on outgoing messages
const RANGE     = 1           // proximity radius in tiles (3×3 = RANGE 1)

// ── Init ──────────────────────────────────────────────────────────
export function initGroupChat({ posGetter, myId, channel, channelOverride }) {
  // Guard: double-init prevention — must be FIRST line.
  // NOTE: this guard also blocks the advertised channelOverride re-init path
  // (Guild Halls, V2) — re-entering a guild hall and calling initGroupChat
  // again with a new channelOverride will simply no-op here. V2 will need an
  // explicit teardown() export that nulls _panel and unsubscribes; out of
  // scope for V1 (see spec §11.2).
  if (_panel) {
    console.warn('[groupChat] already initialized — ignoring duplicate call')
    return
  }

  // Guard: Ably unavailable
  const activeChannel = channelOverride || channel
  if (!activeChannel) {
    console.warn('[groupChat] Ably channel unavailable — feature disabled')
    return
  }

  _posGetter = posGetter
  _myId      = myId.toLowerCase()
  _channel   = activeChannel

  // Build and mount panel DOM
  _buildPanel()
  document.body.appendChild(_panel)

  // Cache sub-elements
  _msgList = document.getElementById('gc-msgs')
  _input   = document.getElementById('gc-input')

  // Wire static listeners
  document.getElementById('gc-close-btn').addEventListener('click', closeGroupChat)
  document.getElementById('gc-send-btn').addEventListener('click', _sendMessage)
  _input.addEventListener('keydown', _onInputKeydown)

  // Subscribe to incoming chat events (single subscription, never removed)
  _channel.subscribe('chat', _handleIncoming)

  // ── VOICE V2 INTEGRATION POINT ──────────────────────────────────────────
  // When LiveKit proximity voice ships, initialise the voice subsystem here.
  // It receives the same posGetter and myId, and hooks the same RANGE=1 check.
  // Suggested call: initProximityVoice({ posGetter, myId, panelHeader: document.getElementById('gc-header') })
  // The voice module will add mute/unmute UI to #gc-header and manage LiveKit room
  // entry/exit based on whether any players enter the same 3×3 cluster.
  // ────────────────────────────────────────────────────────────────────────

  // Mobile toggle button — isTouchDevice is a boolean constant, NOT a function
  if (isTouchDevice) {
    const btn = document.createElement('button')
    btn.id = 'chat-toggle-btn'
    btn.textContent = '💬'
    btn.addEventListener('click', () => {
      if (!panelOpen() && !npcDialogueOpen()) toggleGroupChat()
    })
    document.body.appendChild(btn)
    btn.style.display = 'flex'   // override CSS display:none
  }
}

// ── Panel construction ────────────────────────────────────────────
function _buildPanel() {
  _panel = document.createElement('div')
  _panel.id = 'group-chat'
  _panel.innerHTML = `
    <div id="gc-header">
      <span id="gc-title">💬 NEARBY CHAT</span>
      <button id="gc-close-btn" aria-label="Close">✕</button>
    </div>
    <div id="gc-msgs" role="log" aria-live="polite" aria-label="Nearby chat messages"></div>
    <div id="gc-input-row">
      <input id="gc-input" type="text" placeholder="Say something…"
             autocomplete="off" spellcheck="false" maxlength="200"
             aria-label="Chat input" />
      <button id="gc-send-btn" aria-label="Send">→</button>
    </div>
  `
}

// ── Input handling ────────────────────────────────────────────────
function _onInputKeydown(e) {
  if (e.key === 'Escape') { closeGroupChat(); return }
  e.stopPropagation()                       // prevent WASD/arrows reaching document
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    _sendMessage()
  }
}

// ── Sending ───────────────────────────────────────────────────────
function _sendMessage() {
  if (!_channel) return                          // not initialised / Ably unavailable
  const text = _input.value.trim().slice(0, MAX_LEN)
  if (!text) return
  _input.value = ''
  const pos = _posGetter()
  _channel.publish('chat', {
    id:      _myId,
    x:       pos.x,
    y:       pos.y,
    content: text
  })
  // NOTE: Ably's default is echoMessages:true — own published messages ARE delivered
  // back to this client's subscriptions. _handleIncoming guards against double-render
  // with `if (msg.id === _myId) return`. Push own message to local history here, before
  // the echo arrives, so the user sees their message immediately.
  _pushMessage({ id: _myId, content: text, own: true })
}

// ── Receiving ─────────────────────────────────────────────────────
function _handleIncoming(ablyMsg) {
  const msg = ablyMsg.data                        // ChatPayload
  // REQUIRED guard: Ably echoes own messages back by default (echoMessages:true).
  // Without this check, every sent message appears twice — once pushed in _sendMessage,
  // once rendered again when Ably delivers the echo. Do NOT remove as "defensive dead code".
  if (msg.id === _myId) return
  if (!msg.id || !msg.content || msg.x == null || msg.y == null) return  // malformed
  const pos = _posGetter()
  const inRange = (
    Math.abs(Math.floor(msg.x) - Math.floor(pos.x)) <= RANGE &&
    Math.abs(Math.floor(msg.y) - Math.floor(pos.y)) <= RANGE
  )
  if (!inRange) return                            // silently discard out-of-range
  _pushMessage({ id: msg.id, content: msg.content, own: false })
}

// ── Message storage / rendering ───────────────────────────────────
function _pushMessage({ id, content, own }) {
  _messages.push({ id, content, own })
  if (_messages.length > MAX_MSGS) _messages.shift()
  _appendToDOM({ id, content, own })
}

function _appendToDOM({ id, content, own }) {
  const row    = document.createElement('div')
  row.className = `gc-msg ${own ? 'mine' : 'theirs'}`

  const sender  = document.createElement('span')
  sender.className = 'gc-sender'
  sender.textContent = `[${shortAddress(id)}]`

  const body    = document.createElement('span')
  body.className = 'gc-content'
  body.textContent = ` ${content}`            // textContent — XSS-safe

  row.appendChild(sender)
  row.appendChild(body)
  _msgList.appendChild(row)

  // Prune oldest DOM node to keep DOM in sync with _messages[] array.
  // _pushMessage already called _messages.shift() when over MAX_MSGS;
  // this mirrors that removal in the DOM.
  while (_msgList.children.length > MAX_MSGS) {
    _msgList.removeChild(_msgList.firstChild)
  }

  _msgList.scrollTop = _msgList.scrollHeight
}

// ── Open / close / toggle ─────────────────────────────────────────
export function openGroupChat() {
  if (!_panel) return                        // initGroupChat not yet called
  _panel.classList.add('on')
  _open = true
  document.exitPointerLock()
  _input.focus()
}

export function closeGroupChat() {
  if (!_panel) return
  const wasOpen = _open
  _panel.classList.remove('on')
  _open = false
  _input.blur()
  if (wasOpen) {
    const canvas = document.getElementById('c')
    if (canvas && document.hasFocus()) canvas.requestPointerLock()
  }
}

export function toggleGroupChat() {
  if (_open) closeGroupChat(); else openGroupChat()
}

export function isGroupChatOpen() { return _open }

// ── Local helpers for the mobile-button guard ─────────────────────
// groupChat.js must not import from main.js (circular dependency), so we
// re-derive the same panel/NPC-open checks locally from the DOM, mirroring
// main.js's panelOpen()/npcDialogueOpen(). Mutual exclusion for the keyboard
// path is enforced in main.js (§7.4); this mirrors it for the mobile button
// (critic v2, New Finding A).
function panelOpen() {
  const sp = document.getElementById('sp')
  const dm = document.getElementById('dm-panel')
  return (sp && sp.classList.contains('on'))
      || (dm && dm.classList.contains('on'))
      || _open
}

function npcDialogueOpen() {
  const npc = document.getElementById('npc-dialogue')
  return !!(npc && npc.classList.contains('on'))
}
