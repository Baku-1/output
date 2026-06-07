// ═══════════════════════════════════════════════════════════════
// multiplayer.js — Ably Realtime position broadcast
// The Outlet — WebZone 001
//
// Transport: Ably (development) → Socket.io self-hosted (production)
//
// Architecture:
//   [Ably WS] → async → [remoteCache{}] → read at 60fps → render
//
// Remote players are interpolated (lerp) from network packets.
// Avatar textures load async and inject into remoteCache when ready.
// ═══════════════════════════════════════════════════════════════
import { Realtime } from 'ably'
import {
  ABLY_API_KEY, REALTIME_CHANNEL,
  LERP_FACTOR, PLAYER_TIMEOUT, BROADCAST_HZ
} from './config.js'
import { loadPlayerAvatar } from './avatarCache.js'
import { isAxieAvatarUrl } from './nftService.js'

// ── Remote player cache ───────────────────────────────────────
// Keyed by wallet address. Read by render loop at 60fps.
// Written by network callback asynchronously.
//
// {
//   x, y,                  — interpolated (rendered) position
//   targetX, targetY,      — latest network position
//   dirX, dirY,            — facing direction
//   color: [r,g,b],        — HSL fallback color
//   texture: Uint8Array|SpineAvatarInstance|null
//   lastSeen: timestamp
// }
export const remoteCache = {}

// ── Ably state ────────────────────────────────────────────────
let ablyClient   = null
let ablyChannel  = null
let channelReady = false
let broadcastFrame = 0
let myId         = null

// ── Color from wallet address ─────────────────────────────────
function idToColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xFFFFFF
  return hslToRgb((Math.abs(h) % 360) / 360, 0.9, 0.62)
}

function hslToRgb(h, s, l) {
  const q = l < .5 ? l*(1+s) : l+s-l*s, p = 2*l-q
  const ch = t => { t=((t%1)+1)%1; if(t<1/6) return p+(q-p)*6*t; if(t<.5) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p }
  return [Math.round(ch(h+1/3)*255), Math.round(ch(h)*255), Math.round(ch(h-1/3)*255)]
}

function _myAvatarUrl() {
  if (!myId) return null
  return sessionStorage.getItem(`avatar-url:${myId}`)
}

function _avatarIsAxie(url) {
  if (isAxieAvatarUrl(url)) return true
  if (!myId) return false
  return sessionStorage.getItem(`avatar-is-axie:${myId}`) === '1'
}

function _loadRemoteAvatar(id, avatarUrl) {
  loadPlayerAvatar(id, tex => {
    if (remoteCache[id]) remoteCache[id].texture = tex
  }, avatarUrl)
}

// ── Handle incoming position packet ──────────────────────────
function _handlePos(payload) {
  if (payload.id === myId) return
  const now = Date.now()
  const id  = payload.id

  if (!remoteCache[id]) {
    remoteCache[id] = {
      x:         payload.x,
      y:         payload.y,
      targetX:   payload.x,
      targetY:   payload.y,
      dirX:      payload.dx,
      dirY:      payload.dy,
      color:     idToColor(id),
      avatarUrl: payload.avatarUrl || null,
      isAxie:    payload.isAxie ?? isAxieAvatarUrl(payload.avatarUrl),
      texture:   null,
      lastSeen:  now,
    }
    _loadRemoteAvatar(id, payload.avatarUrl)
  } else {
    remoteCache[id].targetX  = payload.x
    remoteCache[id].targetY  = payload.y
    remoteCache[id].dirX     = payload.dx
    remoteCache[id].dirY     = payload.dy
    remoteCache[id].lastSeen = now
    if (payload.avatarUrl && payload.avatarUrl !== remoteCache[id].avatarUrl) {
      remoteCache[id].avatarUrl = payload.avatarUrl
      remoteCache[id].isAxie    = payload.isAxie ?? isAxieAvatarUrl(payload.avatarUrl)
      remoteCache[id].texture   = null
      _loadRemoteAvatar(id, payload.avatarUrl)
    }
  }

  updatePlayerCount()
}

// ── Init ──────────────────────────────────────────────────────
export function initMultiplayer(walletAddress) {
  myId = walletAddress

  if (!ABLY_API_KEY) {
    console.warn('[multiplayer] VITE_ABLY_API_KEY not set — multiplayer disabled')
    return
  }

  try {
    ablyClient  = new Realtime({ key: ABLY_API_KEY, clientId: myId })
    ablyChannel = ablyClient.channels.get(REALTIME_CHANNEL)

    // ── Subscribe to position updates ────────────────────────
    ablyChannel.subscribe('pos', (msg) => _handlePos(msg.data))

    // ── Subscribe to store entry events ─────────────────────
    ablyChannel.subscribe('enter', (msg) => {
      const payload = msg.data
      if (payload.id === myId) return
      if (_onStoreEntry) _onStoreEntry(payload.id, payload.store)
    })

    // ── Mark ready once connected ────────────────────────────
    ablyClient.connection.once('connected', () => {
      setTimeout(() => { channelReady = true }, 250)
    })

  } catch (e) {
    console.warn('[multiplayer] Ably init failed:', e)
  }
}

// ── Expose Ably client for DM system ─────────────────────────
export function getAblyClient() { return ablyClient }

// ── Store entry events ────────────────────────────────────────
let _onStoreEntry = null
export function onStoreEntry(cb) { _onStoreEntry = cb }

export function broadcastStoreEntry(storeId) {
  if (!ablyChannel || !channelReady || !myId) return
  ablyChannel.publish('enter', { id: myId, store: storeId })
}

// ── Broadcast own position at BROADCAST_HZ ───────────────────
let _lastBroadcastX = null, _lastBroadcastY = null
let _lastBroadcastDX = null, _lastBroadcastDY = null

export function broadcastPosition(posX, posY, dirX, dirY) {
  if (!ablyChannel || !channelReady || !myId) return
  broadcastFrame++
  if (broadcastFrame % Math.round(60 / BROADCAST_HZ) !== 0) return

  // NOTE: do NOT skip idle players — skipping stops lastSeen updates on other
  // clients and causes them to prune this player after PLAYER_TIMEOUT.
  _lastBroadcastX = posX; _lastBroadcastY = posY
  _lastBroadcastDX = dirX; _lastBroadcastDY = dirY

  ablyChannel.publish('pos', {
    id: myId, x: posX, y: posY, dx: dirX, dy: dirY,
    avatarUrl: _myAvatarUrl(),
    isAxie:    _avatarIsAxie(_myAvatarUrl()),
  })
}

// ── Frame-rate-independent lerp ───────────────────────────────
export function interpolatePlayers(dt) {
  const alpha = 1 - Math.exp(-LERP_FACTOR * dt)
  const now   = Date.now()

  for (const id in remoteCache) {
    const p = remoteCache[id]
    if (now - p.lastSeen > PLAYER_TIMEOUT) {
      delete remoteCache[id]
      updatePlayerCount()
      continue
    }
    p.x += (p.targetX - p.x) * alpha
    p.y += (p.targetY - p.y) * alpha
  }
}

// ── Active player count for HUD ───────────────────────────────
export function updatePlayerCount() {
  const now    = Date.now()
  const active = Object.values(remoteCache)
    .filter(p => now - p.lastSeen < PLAYER_TIMEOUT).length
  const el = document.getElementById('player-count')
  if (el) el.textContent = `● ${active + 1} online`
}
