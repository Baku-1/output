// ═══════════════════════════════════════════════════════════════
// wallet.js — Ronin Wallet via @sky-mavis/tanto-connect
// The Outlet — WebZone 001
//
// Exports expected by main.js:
//   connectRonin()        → Promise<address string>   (throws on failure)
//   getAddress()          → string | null
//   shortAddress(addr)    → string
//   onAccountChange(cb)   → void  cb receives { address, isConnected }
// ═══════════════════════════════════════════════════════════════

import {
  ChainIds,
  ConnectorError,
  ConnectorErrorType,
  ConnectorEvent,
  requestRoninWalletConnector,
} from '@sky-mavis/tanto-connect'

// ── Internal state ────────────────────────────────────────────
let _connector  = null   // set once on first connectRonin() call
let _address    = null   // current connected address
let _accountCbs = []     // onAccountChange listeners

// Eagerly start connector discovery at module load.
// requestRoninWalletConnector() waits ~700 ms for EIP-6963 announcements.
// Doing it here (not inside the click handler) preserves the user-gesture
// context so the wallet popup is allowed to open.
const _connectorPromise = requestRoninWalletConnector()
_connectorPromise.catch(() => {})  // silence unhandled rejection if ext missing

// ── Helpers ───────────────────────────────────────────────────

function _notifyListeners(address) {
  const payload = { address, isConnected: !!address }
  _accountCbs.forEach(cb => cb(payload))
}

function _wireEvents(connector) {
  connector.on(ConnectorEvent.ACCOUNTS_CHANGED, accounts => {
    _address = accounts?.[0] ?? null
    _notifyListeners(_address)
  })
  connector.on(ConnectorEvent.DISCONNECT, () => {
    _address = null
    _notifyListeners(null)
  })
}

// ── Public API ────────────────────────────────────────────────

/**
 * Connect to Ronin Wallet.
 * - If the site is already authorised, autoConnect() returns the address instantly.
 * - Otherwise connect() triggers the approval popup.
 * Returns the connected address string, or throws a human-readable Error.
 */
export async function connectRonin() {
  console.log('[WALLET] connectRonin() entered')

  // Await the eagerly-started promise (already settled → microtask cost only).
  let connector
  try {
    connector = await _connectorPromise
    console.log('[WALLET] connector resolved:', connector)
  } catch (err) {
    console.error('[WALLET] _connectorPromise rejected:', err)
    if (err instanceof ConnectorError &&
        err.name === ConnectorErrorType.PROVIDER_NOT_FOUND) {
      throw new Error(
        'Ronin Wallet extension not found. ' +
        'Install it at https://wallet.roninchain.com and reload.'
      )
    }
    throw new Error(err?.message || 'Could not reach Ronin Wallet.')
  }

  // Wire events the first time we get a connector reference.
  if (!_connector) {
    _connector = connector
    _wireEvents(connector)
  }

  // Try silent reconnect first (already approved session).
  let result
  try {
    result = await connector.autoConnect()
    console.log('[WALLET] autoConnect() result:', result)
  } catch (err) {
    console.warn('[WALLET] autoConnect() threw (swallowing):', err)
    result = null
  }

  // Fall back to the full approval flow.
  if (!result) {
    console.log('[WALLET] autoConnect returned falsy — calling connect()')
    try {
      result = await connector.connect(ChainIds.RoninMainnet)
      console.log('[WALLET] connect() result:', result)
    } catch (err) {
      console.error('[WALLET] connect() threw:', err)
      throw new Error(err?.message || 'Connection cancelled or failed.')
    }
  }

  console.log('[WALLET] result.account:', result?.account)
  if (!result?.account) throw new Error('No account returned from wallet.')

  _address = result.account
  return _address
}

/**
 * Returns the currently connected address, or null.
 */
export function getAddress() {
  return _address
}

/**
 * Formats a full address for compact display: 0x1234…abcd
 */
export function shortAddress(addr) {
  if (!addr) return '—'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

/**
 * Register a listener for account / connection changes.
 * The callback receives { address: string|null, isConnected: boolean }.
 */
export function onAccountChange(cb) {
  _accountCbs.push(cb)
}
