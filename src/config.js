// ═══════════════════════════════════════════════════════════════
// The Outlet — Central Config
// All API keys, chain config, and tunable constants live here
// ═══════════════════════════════════════════════════════════════

export const ZONE_NAME        = 'The Outlet'
export const ZONE_TAGLINE     = 'WebZone 001 · Game Mall'

// ── Ably (Realtime broadcast — replaces Supabase Realtime) ────
// Final production target: self-hosted Socket.io on VPS
// Development: Ably free tier (6M messages/month)
export const ABLY_API_KEY     = import.meta.env.VITE_ABLY_API_KEY || ''
export const REALTIME_CHANNEL = 'outlet-mall-v1'

// ── Supabase (kept for reference, no longer used for Realtime) ─
export const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Ronin Chain ────────────────────────────────────────────────
export const RONIN_CHAIN_ID   = 2020          // mainnet (2021 = Saigon testnet)
export const SKY_MAVIS_API_KEY = import.meta.env.VITE_SKY_MAVIS_API_KEY
export const RONIN_RPC        = `https://api-gateway.skymavis.com/rpc?apikey=${SKY_MAVIS_API_KEY}`

// ── Sky Mavis API ──────────────────────────────────────────────
export const MAVIS_NFT_API    = 'https://api-gateway.skymavis.com/v2/collections'

// ── Moralis (NFT data — Ronin chain) ──────────────────────────
// Free-tier key. Treat as semi-public (client-side dApp).
// Rotate at https://admin.moralis.io if compromised.
export const MORALIS_API_KEY  = import.meta.env.VITE_MORALIS_API_KEY
export const MORALIS_CHAIN    = '0x7e4'   // Ronin mainnet chain ID in hex

// ── Groq (NPC chat — fast llama inference) ────────────────────
// API key is server-side only (vite dev proxy / api/npc-chat.js) — never
// exported here, so it can't be baked into the client bundle.
export const GROQ_MODEL       = import.meta.env.VITE_GROQ_MODEL   || 'llama-3.1-8b-instant'

// ── Avatar background removal (Phase 1.3) ─────────────────────
// Manhattan-distance tolerance (R+G+B) for the border BFS peel in
// imageBgRemoval.js. INTENTIONALLY different per collection/path —
// tuned by eye per art style, do NOT unify:
//   axie:        Axie marketplace portraits (shallow peel, mask-safe)
//   generic:     static generic-NFT path in avatarCache (raised from 40
//                to catch tan/beige/off-white backgrounds)
//   genericSpine: generic 6-bone Spine bake path
export const BG_TOLERANCE = {
  axie:         50,
  generic:      55,
  genericSpine: 40,
}

// ── Renderer ──────────────────────────────────────────────────
// Fog falloff (fraction of MAP_H at which fog reaches full). INTENTIONALLY
// different per pass — floor-cast vs wall DDA/sprites are separate pipelines
// tuned separately (Phase 1.5, naming only — values unchanged).
export const FLOOR_FOG_FACTOR = 0.6
export const WALL_FOG_FACTOR  = 0.65
// Spine ghost-canvas Y where the avatar's ground contact sits (Phase 1.4 —
// single source of truth; lives here so renderer.js doesn't have to import
// the lazy-loaded pixi/spine stack just for a constant).
export const SPINE_CANVAS_FEET_Y = 480
export const RENDER_SCALE     = 0.70   // internal resolution (bump for sharpness)
export const FOV_PLANE        = 0.70   // camera plane width (~70° FOV)
export const WALL_HEIGHT      = 1.5    // wall slice height multiplier
// Camera pitch: fraction of screen height the horizon sits ABOVE center.
// Positive = looking slightly downward (more floor visible, higher camera angle).
// 0.06 ≈ 6% → horizon 36px above center on a 600px canvas.
export const CAMERA_PITCH     = 0.06
export const MOVE_SPEED       = 4.5    // map units / sec
export const TURN_SPEED       = 2.0    // radians / sec
export const MOUSE_SENSITIVITY= 0.0025

// ── Texture sizes ──────────────────────────────────────────────
export const WALL_TEX_SIZE    = 64     // wall texture resolution
export const STORE_TEX_SIZE   = 256    // storefront texture — 256px gives sharper key art in panels

// ── Multiplayer ────────────────────────────────────────────────
export const BROADCAST_HZ     = 5      // position packets per second (was 30 — cut 83% of Supabase messages)
export const LERP_FACTOR      = 8      // remote player smoothing
export const PLAYER_TIMEOUT   = 120000 // ms before removing idle remote player (2 min)
export const MAX_PLAYERS      = 32

// ── Avatar cache (IndexedDB) ───────────────────────────────────
export const IDB_DB_NAME      = 'TheOutlet'
export const IDB_DB_VERSION   = 8
export const IDB_STORE_NAME   = 'avatars'
export const AVATAR_TEX_SIZE    = 256
export const AVATAR_SPRITE_SCALE = 0.70   // player billboard size (1 = wall height)
export const AVATAR_CACHE_TTL   = 7 * 24 * 60 * 60 * 1000

// ── IPFS Gateway fallback chain ────────────────────────────────
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://4everland.io/ipfs/',
]
