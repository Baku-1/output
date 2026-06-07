// =================================================================
// dmService.js -- Ably-backed P2P direct messaging
// The Outlet -- WebZone 001
//
// Channel naming: dm:<addrLo>:<addrHi>  (sorted, deterministic)
// Message envelope:
//   { from, to, content, type, trade_payload, ts }
//   type: 'text' | 'trade_offer' | 'trade_accepted' | 'trade_declined'
//
// History: Ably rewind=50 on attach (free tier: ~2-min window).
// =================================================================

let _ably   = null   // Ably Realtime instance (from multiplayer.js)
let _myAddr = null   // normalised lowercase wallet address

// channel cache: Map<channelName, Ably.RealtimeChannel>
const _channels = new Map()

// per-conversation message callbacks: Map<channelName, Set<fn>>
const _callbacks = new Map()

// inbox channel (attached once at initDM, never detached)
let _inboxChannel = null

// inbox notification callbacks: Set<fn>
const _inboxCbs = new Set()

// -- Init --------------------------------------------------------
export function initDM(myAddress, ablyClient) {
  if (!ablyClient) {
    console.warn('[dmService] ablyClient is null -- DMs disabled')
    return
  }
  _myAddr = myAddress.toLowerCase()
  _ably   = ablyClient

  const inboxName = `inbox:${_myAddr}`
  _inboxChannel = _ably.channels.get(inboxName)   // no rewind param -- live delivery only
  _inboxChannel.subscribe('notify', (ablyMsg) => {
    const payload = ablyMsg.data
    _inboxCbs.forEach(fn => fn(payload))
  })
}

// -- Channel name helper -----------------------------------------
export function dmChannelName(addrA, addrB) {
  const [lo, hi] = [addrA.toLowerCase(), addrB.toLowerCase()].sort()
  return `dm:${lo}:${hi}`
}

// -- Open (or return cached) a DM conversation channel ----------
// Attaches with rewind=50 so history is replayed on subscribe.
// Returns the Ably channel object.
export function openConversation(theirAddr) {
  if (!_ably) throw new Error('[dmService] not initialised -- call initDM first')

  const name = dmChannelName(_myAddr, theirAddr)
  if (_channels.has(name)) return _channels.get(name)

  // Fix #2: pre-initialise callbacks entry BEFORE attach so rewind
  // delivery (which fires on subscribe) always finds a valid Set
  // rather than silently dropping messages.
  if (!_callbacks.has(name)) _callbacks.set(name, new Set())

  // rewind: replay last 50 msgs on attach (Ably free tier: ~2 min window)
  const ch = _ably.channels.get(name, { params: { rewind: '50' } })

  ch.subscribe('msg', (ablyMsg) => {
    const payload = ablyMsg.data
    const cbs = _callbacks.get(name)
    if (cbs) cbs.forEach(fn => fn(payload))
  })

  _channels.set(name, ch)
  return ch
}

// -- Send a message to a conversation ---------------------------
export function sendMessage(theirAddr, payload) {
  if (!_myAddr) throw new Error('[dmService] not initialised')

  const ch = openConversation(theirAddr)
  const envelope = {
    from:          _myAddr,
    to:            theirAddr.toLowerCase(),
    content:       payload.content   ?? '',
    type:          payload.type      ?? 'text',
    trade_payload: payload.trade_payload ?? null,
    ts:            Date.now(),
  }
  return ch.publish('msg', envelope)
}

// -- Register a callback for incoming messages ------------------
// Returns an unsubscribe function.
// Fix #1: guard _myAddr, theirAddr, and cb before proceeding.
// Returns a no-op unsubscribe on failure so callers don't crash.
export function onMessage(theirAddr, cb) {
  if (!_myAddr) {
    console.error('[dmService] onMessage called before initDM -- ignoring')
    return () => {}
  }
  if (!theirAddr) {
    console.error('[dmService] onMessage called with null theirAddr -- ignoring')
    return () => {}
  }
  if (typeof cb !== 'function') {
    console.error('[dmService] onMessage called with non-function callback -- ignoring')
    return () => {}
  }

  const name = dmChannelName(_myAddr, theirAddr)
  if (!_callbacks.has(name)) _callbacks.set(name, new Set())
  _callbacks.get(name).add(cb)

  // Ensure channel is open so rewind fires
  openConversation(theirAddr)

  return () => _callbacks.get(name)?.delete(cb)
}

// -- Fetch Ably message history for a conversation --------------
// Fix #3: paginate to retrieve the full conversation, not just
// the first 50 messages.  Queries backwards (newest-first) then
// reverses so callers receive messages oldest-first.
// Hard cap: 20 pages x 100 msgs = 2000 messages max to prevent
// unbounded fetches on long-lived channels.
// On mid-pagination network error, returns partial results so far.
const HISTORY_PAGE_LIMIT = 100
const HISTORY_MAX_PAGES  = 20

export async function fetchHistory(theirAddr) {
  const ch = openConversation(theirAddr)
  const allMessages = []

  let page = await ch.history({ limit: HISTORY_PAGE_LIMIT, direction: 'backwards' })
  let pageCount = 0

  while (page) {
    allMessages.push(...page.items.map(m => m.data))
    pageCount++
    if (pageCount >= HISTORY_MAX_PAGES) {
      console.warn('[dmService] fetchHistory: hit max page limit, truncating')
      break
    }
    if (!page.hasNext()) break
    try {
      page = await page.next()
    } catch (err) {
      console.warn('[dmService] fetchHistory: pagination error -- returning partial results:', err)
      break
    }
  }

  // Reverse so oldest messages are first (matches render order)
  return allMessages.reverse()
}

// -- Inbox subscription -----------------------------------------
// Register a callback for incoming inbox notifications.
// Returns an unsubscribe function (consistent with onMessage pattern).
export function onInboxMessage(cb) {
  if (typeof cb !== 'function') {
    console.error('[dmService] onInboxMessage: non-function callback -- ignoring')
    return () => {}
  }
  _inboxCbs.add(cb)
  return () => _inboxCbs.delete(cb)
}

// -- Publish to another player's inbox channel ------------------
// Uses Promise.reject for the uninitialised guard so the caller's
// .catch() can handle it (a synchronous throw would escape .catch()).
export function sendToInbox(theirAddr, payload) {
  if (!_ably) return Promise.reject(new Error('[dmService] sendToInbox: not initialised'))
  const ch = _ably.channels.get(`inbox:${theirAddr.toLowerCase()}`)
  return ch.publish('notify', payload)
}

// -- Accessors ---------------------------------------------------
export function getMyAddr()  { return _myAddr }
export function isReady()    { return !!_ably && !!_myAddr }
