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
import { safeTokenId } from './validation.js'

// Lazy trade-module loader (Fix #10)
// Static imports replaced with dynamic imports so a parse/export failure in
// those files does NOT prevent the DM panel from loading at all.
let _trade          = null   // exports of ./trade.js
let _tradeOfferFlow = null   // exports of ./tradeOfferFlow.js

async function _requireTradeModules() {
  if (_trade && _tradeOfferFlow) return
  _trade          = await import('./trade.js')
  _tradeOfferFlow = await import('./tradeOfferFlow.js')
  // Populate tradeable contracts from Mavis Market before the UI opens.
  // Errors are non-fatal — TRADEABLE_CONTRACTS already holds the Axie fallback.
  await _tradeOfferFlow.loadTradeableContracts().catch(err =>
    console.warn('[dmPanel] could not fetch tradeable contracts:', err)
  )
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

// Relative expiry — "in 58 min" is unambiguous where a bare clock time
// ("12:26 AM") read like it was about to expire. Snapshot at render time.
function _formatExpiry(endTime) {
  const secs = endTime - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'expired'
  const m = Math.ceil(secs / 60)
  if (m < 60) return `in ${m} min`
  const h = Math.floor(m / 60), rm = m % 60
  return rm ? `in ${h}h ${rm}m` : `in ${h}h`
}

// Locally-resolved trades (accepted/declined) — survives panel close/
// reopen, which re-renders offers from Ably history with live buttons.
// Keyed by orderHash (always present in trade_payload). sessionStorage:
// per-tab lifetime, comfortably outlives Ably's ~2min history window.
const _RESOLVED_KEY = 'resolved-trades'
let _resolvedTrades = {}
try { _resolvedTrades = JSON.parse(sessionStorage.getItem(_RESOLVED_KEY)) || {} } catch { /* corrupt — start clean */ }
function _markTradeResolved(orderHash, outcome) {
  if (!orderHash) return
  _resolvedTrades[orderHash] = outcome
  try { sessionStorage.setItem(_RESOLVED_KEY, JSON.stringify(_resolvedTrades)) } catch { /* quota — non-fatal */ }
}

// Token ID allow-list (Fix #8 hardening) — shared pattern, validation.js
function _safeTokenId(val) {
  const s = String(val ?? '')
  if (!s) return '?'
  const ok = safeTokenId(s, null)
  if (ok === null) {
    console.warn('[dmPanel] rejected invalid token ID from peer:', s)
    return '[invalid token]'
  }
  return ok
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
  const expiresAt = endTime ? _formatExpiry(endTime) : 'unknown'
  const expiryRow = document.createElement('div')
  expiryRow.className = 'tc-row tc-expiry'
  expiryRow.textContent = 'Expires: ' + expiresAt
  card.appendChild(expiryRow)

  // Resolved earlier this session (accept/decline)? Render the outcome
  // instead of live buttons — fixes decline→reopen→accept resurrection.
  const resolution = p?.orderHash ? _resolvedTrades[p.orderHash] : null
  if (resolution) {
    const done = document.createElement('div')
    done.className = 'tc-done'
    done.textContent = resolution === 'accepted' ? 'Offer accepted.' : 'Offer declined.'
    card.appendChild(done)
  }

  if (!isMine && !resolution) {
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

// Replace a trade card's contents with a final status line.
// Fix #8 discipline: textContent, never innerHTML with dynamic data.
function _setCardDone(cardEl, text, isErr = false) {
  cardEl.replaceChildren()
  const div = document.createElement('div')
  div.className = 'tc-done' + (isErr ? ' tc-err' : '')
  div.textContent = text
  cardEl.appendChild(div)
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

    _setCardDone(cardEl, `✅ Trade submitted! Tx: ${txResponse.hash.slice(0,10)}…`)
    _markTradeResolved(p?.orderHash, 'accepted')

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
  // Mark before the notify send — the user's decision stands even if
  // the courtesy message to the peer fails.
  _markTradeResolved(msg.trade_payload?.orderHash, 'declined')
  try {
    await sendMessage(msg.from, { type: 'trade_declined', content: 'Trade declined.' })
    _setCardDone(cardEl, 'Offer declined.')
  } catch (err) {
    console.error('[dmPanel] decline failed:', err)
    _setCardDone(cardEl, 'Decline failed.', true)
  }
}
