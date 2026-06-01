// ═══════════════════════════════════════════════════════════════
// The Outlet — Central Config
// All API keys, chain config, and tunable constants live here
// ═══════════════════════════════════════════════════════════════

export const ZONE_NAME        = 'The Outlet'
export const ZONE_TAGLINE     = 'WebZone 001 · Game Mall'

// ── Supabase (Realtime broadcast — ephemeral, no DB writes) ───
export const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY
export const REALTIME_CHANNEL = 'outlet-mall-v1'

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

// ── Anthropic AI Guide ─────────────────────────────────────────
export const ANTHROPIC_MODEL  = 'claude-sonnet-4-5'

// ── Renderer ──────────────────────────────────────────────────
export const RENDER_SCALE     = 0.70   // internal resolution (bump for sharpness)
export const FOV_PLANE        = 0.70   // camera plane width (~70° FOV)
export const WALL_HEIGHT      = 1.5    // wall slice height multiplier
export const MOVE_SPEED       = 4.5    // map units / sec
export const TURN_SPEED       = 2.0    // radians / sec
export const MOUSE_SENSITIVITY= 0.0025

// ── Texture sizes ──────────────────────────────────────────────
export const WALL_TEX_SIZE    = 64     // wall texture resolution
export const STORE_TEX_SIZE   = 256    // storefront texture — 256px gives sharper key art in panels

// ── Multiplayer ────────────────────────────────────────────────
export const BROADCAST_HZ     = 30     // position packets per second
export const LERP_FACTOR      = 8      // remote player smoothing
export const PLAYER_TIMEOUT   = 6000   // ms before removing stale remote player
export const MAX_PLAYERS      = 32

// ── Avatar cache (IndexedDB) ───────────────────────────────────
export const IDB_DB_NAME      = 'TheOutlet'
export const IDB_DB_VERSION   = 1
export const IDB_STORE_NAME   = 'avatars'
export const AVATAR_TEX_SIZE  = 64
export const AVATAR_CACHE_TTL = 7 * 24 * 60 * 60 * 1000

// ── IPFS Gateway fallback chain ────────────────────────────────
export const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
]
