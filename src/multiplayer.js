// ═══════════════════════════════════════════════════════════════
// multiplayer.js — Supabase Realtime position broadcast
// Architecture per Gemini:
//   [Network WS] → async → [remoteCache] → read at 60fps → render
// ═══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL, SUPABASE_ANON, REALTIME_CHANNEL,
  LERP_FACTOR, PLAYER_TIMEOUT, BROADCAST_HZ
} from './config.js'
import { loadPlayerAvatar } from './avatarCache.js'

// ── Remote player cache ───────────────────────────────────────
// Keyed by wallet address. Read by render loop at 60fps.
// Written by network callback asynchronously.
//
// Structure per Gemini:
// {
//   x, y,                  — interpolated (rendered) position
//   targetX, targetY,      — latest network position
//   dirX, dirY,            — facing direction
//   color: [r,g,b],        — HSL fallback color
//   texture: ImageData|null — 64×64 NFT texture (null until loaded)
//   lastSeen: timestamp
// }
export const remoteCache = {}

// ── Supabase state ────────────────────────────────────────────
let sbClient     = null
let sbChannel    = null
let channelReady = false
let broadcastFrame = 0
let myId         = null   // wallet address set by initMultiplayer()

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

function _loadRemoteAvatar(id, avatarUrl) {
  loadPlayerAvatar(id, tex => {
    if (remoteCache[id]) remoteCache[id].texture = tex
  }, avatarUrl)
}

// ── Init ──────────────────────────────────────────────────────

export function initMultiplayer(walletAddress) {
  myId = walletAddress

  try {
    sbClient  = createClient(SUPABASE_URL, SUPABASE_ANON)
    sbChannel = sbClient.channel(REALTIME_CHANNEL, {
      config: { broadcast: { self: false } }
    })

    // ── Receive remote positions (async network callback) ────
    sbChannel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (payload.id === myId) return
      const now = Date.now()
      const id  = payload.id

      if (!remoteCache[id]) {
        // First packet from this player — snap to position
        remoteCache[id] = {
          x:       payload.x,
          y:       payload.y,
          targetX: payload.x,
          targetY: payload.y,
          dirX:    payload.dx,
          dirY:    payload.dy,
          color:     idToColor(id),
          avatarUrl: payload.avatarUrl || null,
          texture:   null,
          lastSeen:  now,
        }
        // Kick off avatar load in the background
        // When it resolves, inject the 64×64 ImageData into the cache entry
        _loadRemoteAvatar(id, payload.avatarUrl)
      } else {
        // Subsequent packets — update target only, lerp handles movement
        remoteCache[id].targetX  = payload.x
        remoteCache[id].targetY  = payload.y
        remoteCache[id].dirX     = payload.dx
        remoteCache[id].dirY     = payload.dy
        remoteCache[id].lastSeen = now
        if (payload.avatarUrl && payload.avatarUrl !== remoteCache[id].avatarUrl) {
          remoteCache[id].avatarUrl = payload.avatarUrl
          remoteCache[id].texture   = null
          _loadRemoteAvatar(id, payload.avatarUrl)
        }
      }

      updatePlayerCount()
    })

    _listenStoreEntries()

    // Gate broadcasts behind SUBSCRIBED + 250ms grace (eliminates REST fallback)
    sbChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setTimeout(() => { channelReady = true }, 250)
    })

  } catch (e) {
    console.warn('[multiplayer] Init failed:', e)
  }
}

// ── Store entry event ─────────────────────────────────────────
// Callback registered by main.js to surface "PlayerX entered Store" events

let _onStoreEntry = null
export function onStoreEntry(cb) { _onStoreEntry = cb }

// Receive store-entry broadcasts from other players
function _listenStoreEntries() {
  sbChannel.on('broadcast', { event: 'enter' }, ({ payload }) => {
    if (payload.id === myId) return
    if (_onStoreEntry) _onStoreEntry(payload.id, payload.store)
  })
}

// Broadcast that the local player entered a store (fire-and-forget)
export function broadcastStoreEntry(storeId) {
  if (!sbChannel || !channelReady || !myId) return
  sbChannel.send({
    type:    'broadcast',
    event:   'enter',
    payload: { id: myId, store: storeId },
  })
}

// ── Broadcast own position at ~30Hz ──────────────────────────
// Called every frame from update(). Guards with channelReady flag.

export function broadcastPosition(posX, posY, dirX, dirY) {
  if (!sbChannel || !channelReady || !myId) return
  broadcastFrame++
  if (broadcastFrame % Math.round(60 / BROADCAST_HZ) !== 0) return

  sbChannel.send({
    type:    'broadcast',
    event:   'pos',
    payload: { id: myId, x: posX, y: posY, dx: dirX, dy: dirY, avatarUrl: _myAvatarUrl() },
  })
}

// ── Frame-rate-independent lerp (Gemini: smooth 60fps from 30Hz network) ─
// Uses exponential decay: k=LERP_FACTOR, independent of framerate.

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
