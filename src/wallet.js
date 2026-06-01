// ═══════════════════════════════════════════════════════════════
// wallet.js — Ronin Wallet via @sky-mavis/tanto-connect
// The Outlet — WebZone 001
//
// Exports expected by main.js:
//   connectRoninExtension() → Promise<address string>
//   connectRoninMobile()    → Promise<address string>
//   connectWaypoint()       → Promise<address string>
//   getAddress()            → string | null
//   shortAddress(addr)      → string
//   onAccountChange(cb)     → void  cb receives { address, isConnected }
// ═══════════════════════════════════════════════════════════════

import {
  ChainIds,
  ConnectorError,
  ConnectorErrorType,
  ConnectorEvent,
  requestRoninWalletConnector,
  requestRoninWalletConnectConnector,
  requestWaypointConnector,
} from '@sky-mavis/tanto-connect'

const RONIN_PROJECT_ID    = import.meta.env.VITE_RONIN_PROJECT_ID

// ── Internal state ────────────────────────────────────────────
let _activeConnector = null
let _address = null
let _accountCbs = []

// Eagerly start extension connector discovery
const _extConnectorPromise = requestRoninWalletConnector()
_extConnectorPromise.catch(() => {})

function _notifyListeners(address) {
  const payload = { address, isConnected: !!address }
  _accountCbs.forEach(cb => cb(payload))
}

function _wireEvents(connector) {
  if (_activeConnector && _activeConnector !== connector) {
    _activeConnector.removeAllListeners?.(ConnectorEvent.ACCOUNTS_CHANGED)
    _activeConnector.removeAllListeners?.(ConnectorEvent.DISCONNECT)
  }
  _activeConnector = connector

  connector.on(ConnectorEvent.ACCOUNTS_CHANGED, accounts => {
    _address = accounts?.[0] ?? null
    _notifyListeners(_address)
  })
  connector.on(ConnectorEvent.DISCONNECT, () => {
    _address = null
    _notifyListeners(null)
  })
}

async function _doConnect(connectorPromise, chainId = ChainIds.RoninMainnet) {
  let connector
  try {
    connector = await connectorPromise
  } catch (err) {
    if (err instanceof ConnectorError && err.name === ConnectorErrorType.PROVIDER_NOT_FOUND) {
      throw new Error('Ronin Wallet extension not found. Install it at https://wallet.roninchain.com')
    }
    throw new Error(err?.message || 'Could not initialize wallet connector.')
  }

  _wireEvents(connector)

  let result
  try {
    result = await connector.autoConnect()
  } catch (err) {
    result = null
  }

  if (!result) {
    try {
      result = await connector.connect(chainId)
    } catch (err) {
      throw new Error(err?.message || 'Connection cancelled or failed.')
    }
  }

  if (!result?.account) throw new Error('No account returned from wallet.')
  _address = result.account
  return _address
}

export function connectRoninExtension() {
  console.log('[WALLET] connectRoninExtension() entered')
  return _doConnect(_extConnectorPromise)
}

export function connectRoninMobile() {
  console.log('[WALLET] connectRoninMobile() entered')
  const wcPromise = requestRoninWalletConnectConnector({
    providerOptions: {
      projectId: RONIN_PROJECT_ID,
      chains: [ChainIds.RoninMainnet],
      metadata: {
        name: 'The Outlet',
        description: 'WebZone 001',
        url: window.location.origin,
        icons: [window.location.origin + '/favicon.png']
      }
    }
  })
  return _doConnect(wcPromise)
}

export function connectWaypoint() {
  console.log('[WALLET] connectWaypoint() entered')
  const wpConnector = requestWaypointConnector({
    providerConfigs: {
      clientId: RONIN_PROJECT_ID,
      chainId: ChainIds.RoninMainnet
    }
  })
  return _doConnect(Promise.resolve(wpConnector))
}

export function getAddress() {
  return _address
}

export function shortAddress(addr) {
  if (!addr) return '—'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export function onAccountChange(cb) {
  _accountCbs.push(cb)
}
