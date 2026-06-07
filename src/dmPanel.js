// ═══════════════════════════════════════════════════════════════
// dmPanel.js — In-world DM overlay UI
// The Outlet — WebZone 001
//
// Triggered by pressing F/Space near another player.
// Supports text messages and trade offer cards.
//
// Trade card flow:
//   Incoming 'trade_offer' -> renders Accept / Decline buttons
//   Accept  -> fulfillTradeOrder() on-chain (fulfiller pays gas)
//   Decline -> sends 'trade_declined' DM, dismisses card
//
// CRITIC notes addressed:
//   - Verifies consideration recipient === offerer before fulfilling (#6 corrected)
//   - Trade offer expiry shown in card (#4/#5)
// ═══════════════════════════════════════════════════════════════

import { onMessage, sendMessage, fetchHistory, isReady } from './dmService.js'
import { getAddress, shortAddress } from './wallet.js'

// Lazy trade-module loader (Fix #10)
// Static imports replaced with dynamic imports so a parse/export failure in
// those files does NOT prevent the DM panel from loading at all.
let _trade          = null   // exports of ./trade.js
let _tradeOfferFlow = null   // exports of ./tradeOfferFlow.js

async function _requireTradeModules() {
  if (_trade && _tradeOfferFlow) return
  _trade          = await import('./trade.js')
  _tradeOfferFlow = await import('./tradeOfferFlow.js')
}

let _panel        = null
let _msgList      = null
let _input        = null
let _theirAddr    = null
let _theirLabel   = null
let _unsubscribe  = null   // cleanup fn from onMessage()
let _open         = false

// Init: build DOM (call once after DOMContentLoaded)
export function initDMPanel() {
  _panel = document.createElement('div')
  _panel.id = 'dm-panel'
  _panel.innerHTML = `
    <div id="dm-header">
      <span id="dm-peer-label"></span>
      <div id="dm-header-btns">
        <button id="dm-trade-btn" title="Send trade offer">\u{1F504} Trade</button>
        <button id="dm-close-btn">✕</button>
      </div>
    </div>
    <div id="dm-msgs"></div>
    <div id="dm-input-row">
      <input id="dm-input" type="text" placeholder="Message…" autocomplete="off" maxlength="500" />
      <button id="dm-send-btn">Send</button>
    </div>
    <p id="dm-history-hint">\u{1F4DC} History limited to ~2 min (Ably free tier)</p>
  `
  document.body.appendChild(_panel)
  _msgList = document.getElementById('dm-msgs')
  _input   = document.getElementById('dm-input')

  document.getElementById('dm-close-btn').addEventListener('click', closeDMPanel)
  document.getElementById('dm-send-btn').addEventListener('click', _sendText)
  document.getElementById('dm-trade-btn').addEventListener('click', async () => {
    if (!_theirAddr) return
    const tradeBtn = document.getElementById('dm-trade-btn')
    const origText = tradeBtn.textContent
    tradeBtn.disabled = true
    tradeBtn.textContent = '⏳'
    try {
      await _requireTradeModules()
      _tradeOfferFlow.openTradeOfferUI(_theirAddr)
    } catch (err) {
      console.error('[dmPanel] Trade feature unavailable:', err)
      _appendSystemMsg(`⚠ Trade unavailable: ${err.message}`)
    } finally {
      tradeBtn.disabled = false
      tradeBtn.textContent = origText
    }
  })
  _input.addEventListener('keydown', e => {
    if (e.key === 'Escape') return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendText() }
    e.stopPropagation()
  })
}

// Open panel for a conversation
export async function openDMPanel(theirAddr, theirLabelText) {
  if (!isReady()) {
    console.warn('[dmPanel] dmService not ready'); return
  }

  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null }

  _theirAddr  = theirAddr.toLowerCase()
  _theirLabel = theirLabelText || shortAddress(theirAddr)
  _open       = true

  document.getElementById('dm-peer-label').textContent = `\u{1F4AC} ${_theirLabel}`
  _msgList.innerHTML = ''
  _panel.classList.add('on')
  document.exitPointerLock()

  const buffer = []
  let historyLoaded = false

  _unsubscribe = onMessage(_theirAddr, msg => {
    if (historyLoaded) {
      _renderMessage(msg, true)
    } else {
      buffer.push(msg)
    }
  })

  try {
    const history = await fetchHistory(_theirAddr)
    historyLoaded = true
    history.forEach(msg => _renderMessage(msg, false))
    const seenIds = new Set(history.map(m => m.id ?? m.ts))
    for (const msg of buffer) {
      if (!seenIds.has(msg.id ?? msg.ts)) _renderMessage(msg, true)
    }
    buffer.length = 0
  } catch (e) {
    historyLoaded = true
    console.warn('[dmPanel] history fetch failed:', e)
    for (const msg of buffer) _renderMessage(msg, true)
    buffer.length = 0
  }

  _input.focus()
}

export function closeDMPanel() {
  const wasOpen = _open   // capture before clearing state
  _panel?.classList.remove('on')
  _open = false
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null }
  _theirAddr = null
  _input?.blur()

  // Only re-acquire pointer lock if the panel was actually open —
  // prevents spurious lock requests when Esc is used for other purposes
  // (e.g. dismissing the trade notification toast).
  const gameCanvas = document.getElementById('c')
  if (wasOpen && gameCanvas && document.hasFocus()) {
    gameCanvas.requestPointerLock()
  }
}

export function isDMPanelOpen() { return _open }

// Returns the lowercase address of the peer whose conversation is open,
// or null if the panel is closed.
export function getOpenPeerAddr() { return _theirAddr }

// Send a text message
async function _sendText() {
  const text = _input.value.trim()
  if (!text || !_theirAddr) return
  _input.value = ''
  try {
    await sendMessage(_theirAddr, { type: 'text', content: text })
  } catch (err) {
    _appendSystemMsg(`⚠ Send failed: ${err.message}`)
  }
}

// Render a message into the thread
function _renderMessage(msg, scroll = true) {
  const myAddr = getAddress()?.toLowerCase()
  const isMine = msg.from?.toLowerCase() === myAddr

  if (msg.type === 'trade_offer') {
    _renderTradeCard(msg, isMine)
  } else if (msg.type === 'trade_accepted') {
    _appendSystemMsg(`✅ ${isMine ? 'You' : 'They'} accepted the trade.`)
  } else if (msg.type === 'trade_declined') {
    _appendSystemMsg(`❌ ${isMine ? 'You' : 'They'} declined the trade.`)
  } else {
    const el = document.createElement('div')
    el.className = `dm-msg ${isMine ? 'mine' : 'theirs'}`
    el.textContent = msg.content
    _msgList.appendChild(el)
  }

  if (scroll) _msgList.scrollTop = _msgList.scrollHeight
}

// Token ID allow-list (Fix #8 hardening)
const _TOKEN_RE = /^[a-zA-Z0-9_-]{1,64}$/
function _safeTokenId(val) {
  const s = String(val ?? '')
  if (!s) return '?'
  if (!_TOKEN_RE.test(s)) {
    console.warn('[dmPanel] rejected invalid token ID from peer:', s)
    return '[invalid token]'
  }
  return s
}

// Trade offer card
// Fix #8: never interpolate peer-supplied data into innerHTML.
function _renderTradeCard(msg, isMine) {
  const p = msg.trade_payload
  const card = document.createElement('div')
  card.className = `dm-trade-card ${isMine ? 'mine' : 'theirs'}`

  const header = document.createElement('div')
  header.className = 'tc-header'
  header.textContent = '\u{1F504} Trade Offer'
  card.appendChild(header)

  const offerRow = document.createElement('div')
  offerRow.className = 'tc-row'
  const offerB = document.createElement('b')
  offerB.textContent = 'Offers:'
  offerRow.appendChild(offerB)
  offerRow.append(' Axie #' + _safeTokenId(p?.offerTokenId))
  card.appendChild(offerRow)

  const wantRow = document.createElement('div')
  wantRow.className = 'tc-row'
  const wantB = document.createElement('b')
  wantB.textContent = 'Wants:'
  wantRow.appendChild(wantB)
  wantRow.append(' Axie #' + _safeTokenId(p?.considerationTokenId))
  card.appendChild(wantRow)

  const endTime = typeof p?.endTime === 'number' ? p.endTime : null
  const expiresAt = endTime ? new Date(endTime * 1000).toLocaleTimeString() : 'unknown'
  const expiryRow = document.createElement('div')
  expiryRow.className = 'tc-row tc-expiry'
  expiryRow.textContent = 'Expires: ' + expiresAt
  card.appendChild(expiryRow)

  if (!isMine) {
    const acceptBtn  = document.createElement('button')
    const declineBtn = document.createElement('button')
    acceptBtn.className  = 'tc-accept'
    declineBtn.className = 'tc-decline'
    acceptBtn.textContent  = 'Accept'
    declineBtn.textContent = 'Decline'

    acceptBtn.addEventListener('click', async () => {
      acceptBtn.disabled = declineBtn.disabled = true
      acceptBtn.textContent = '⏳ Signing…'
      await _handleAccept(msg, card)
    })
    declineBtn.addEventListener('click', async () => {
      acceptBtn.disabled = declineBtn.disabled = true
      await _handleDecline(msg, card)
    })

    const row = document.createElement('div')
    row.className = 'tc-btn-row'
    row.appendChild(acceptBtn)
    row.appendChild(declineBtn)
    card.appendChild(row)
  }

  _msgList.appendChild(card)
}

// Accept trade
async function _handleAccept(msg, cardEl) {
  const myAddr = getAddress()?.toLowerCase()
  const p = msg.trade_payload

  try {
    await _requireTradeModules()

    const order = _trade.deserialiseOrder(p.orderJson)

    // Cross-check msg.from matches the on-chain offerer (prevents spoofed DMs)
    const onChainOfferer = order.parameters.offerer?.toLowerCase()
    if (onChainOfferer && msg.from?.toLowerCase() !== onChainOfferer) {
      throw new Error('Offerer address mismatch — order may be spoofed')
    }

    // Verify all consideration recipients match the offerer (prevents recipient hijacking).
    // Consideration items go to the OFFERER, not the fulfiller. Original check compared
    // against myAddr (fulfiller) which is always different — that would reject every trade.
    const bad = order.parameters.consideration?.some(
      item => item.recipient?.toLowerCase() !== onChainOfferer
    )
    if (bad) throw new Error('Consideration recipient mismatch — expected offerer ' + onChainOfferer)

    // Check order not expired
    const now = Math.floor(Date.now() / 1000)
    if (p.endTime && now > p.endTime) throw new Error('This offer has expired')

    const provider   = _trade.getRoninProvider()
    const signer     = await provider.getSigner()
    const txResponse = await _trade.fulfillTradeOrder(order, myAddr, signer)

    cardEl.innerHTML = `<div class="tc-done">✅ Trade submitted! Tx: ${txResponse.hash.slice(0,10)}…</div>`

    await sendMessage(msg.from, { type: 'trade_accepted', content: `Trade accepted. Tx: ${txResponse.hash}` })

  } catch (err) {
    console.error('[dmPanel] accept failed:', err)
    cardEl.querySelector('.tc-accept')?.replaceWith((() => {
      const s = document.createElement('span')
      s.className = 'tc-error'; s.textContent = `❌ ${err.message}`
      return s
    })())
    cardEl.querySelector('.tc-decline')?.remove()
  }
}

// Decline trade
async function _handleDecline(msg, cardEl) {
  try {
    await sendMessage(msg.from, { type: 'trade_declined', content: 'Trade declined.' })
    cardEl.innerHTML = '<div class="tc-done">Offer declined.</div>'
  } catch (err) {
    console.error('[dmPanel] decline failed:', err)
    cardEl.innerHTML = '<div class="tc-done tc-err">Decline failed.</div>'
  }
}
