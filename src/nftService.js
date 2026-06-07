// nftService.js -- Fetch wallet NFTs via Moralis (Ronin chain)
// The Outlet -- WebZone 001
//
// Returns a normalised array of NFT objects regardless of how
// each collection structures its on-chain metadata.
//
// Fallback cascade:
//   normalizedMetadata.image -> metadata.image -> media thumbnail
//   -> null (no image -- handled by avatarPicker)

import { MORALIS_API_KEY, MORALIS_CHAIN } from './config.js'

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2'
const PAGE_SIZE    = 24
const IMG_TIMEOUT  = 8000   // ms -- plain HTTP URLs (non-IPFS)

// Public IPFS gateways, tried in order until one succeeds.
// cloudflare-ipfs.com was shut down in 2024 and must not appear here.
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://4everland.io/ipfs/',
]
const GATEWAY_TIMEOUT = 5000   // ms per gateway attempt

// Route canvas-baking image loads through the Vercel Edge proxy so responses
// arrive from our own origin, enabling getImageData() without a tainted canvas.
// Display-only <img> loads (picker UI, resolveImageUrl) must NOT use this helper.
function _proxyUrl(src) {
  if (!src) return src
  // Same-origin paths don't need proxying.
  if (src.startsWith('/')) return src
  // In dev mode the edge function doesn't run locally; skip proxying and warn.
  // Run `vercel dev` + a Vite proxy entry for /api/img-proxy if baking is needed locally.
  if (import.meta.env.DEV) {
    console.warn(
      '[nftService] img-proxy skipped in dev mode — canvas baking may fail. ' +
      'Configure a Vite proxy for /api/img-proxy pointing at `vercel dev` if needed.',
    )
    return src
  }
  return `/api/img-proxy?src=${encodeURIComponent(src)}`
}

// Ronin / Ethereum Axie ERC-721 contracts (lowercase)
const AXIE_CONTRACTS = new Set([
  '0x32950db2a7164ae833121501c797d79e7b79d74c', // Axie NFT (Ronin mainnet) — verified explorer.roninchain.com
  '0x97a910714b34c10f9f7b7500f4ef9d8cddd2e0e', // legacy Ronin Axie
  '0xf5b0a3efb8e8e4c201e2a935f110eaaf3ffecb8d', // Ethereum Axie
])

// -- Fetch one page of NFTs ------------------------------------------
export async function fetchWalletNFTs(address, cursor = null) {
  const params = new URLSearchParams({
    chain:             MORALIS_CHAIN,
    format:            'decimal',
    normalizeMetadata: 'true',
    media_items:       'true',
    exclude_spam:      'true',
    limit:             String(PAGE_SIZE),
  })
  if (cursor) params.set('cursor', cursor)

  const res = await fetch(
    `${MORALIS_BASE}/${address}/nft?${params}`,
    { headers: { 'X-API-Key': MORALIS_API_KEY, accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`Moralis ${res.status}: ${res.statusText}`)

  const data = await res.json()
  return {
    nfts:       (data.result ?? []).map(_normalise),
    nextCursor: data.cursor ?? null,
    total:      Number(data.total ?? 0),
  }
}

// -- Resolve an image URL to a loaded HTMLImageElement ---------------
// Tries IPFS gateway fallback chain for IPFS/Pinata URLs.
// Returns the image on success, null if all attempts fail.
// True when avatar URL is from Sky Mavis Axie CDN (or known Axie contract).
export function isAxieAvatarUrl(url) {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('axiecdn.axieinfinity.com') || /\/axies\/\d+\//.test(u)
}

export function isAxieContract(address) {
  return AXIE_CONTRACTS.has((address || '').toLowerCase())
}

export function axieCdnUrl(axieId) {
  return `https://axiecdn.axieinfinity.com/axies/${axieId}/axie/axie-full-transparent.png`
}

// Ordered candidates for Axie bakes — CDN first, then on-chain metadata art.
export function axieImageCandidates(nft) {
  const out = []
  const id = _extractAxieId(nft)
  if (id) out.push(axieCdnUrl(id))
  const meta = nft?.imageUrl
  if (meta && !out.includes(meta)) out.push(meta)
  return out
}

// Best image URL for avatar baking. Axies get Sky Mavis transparent PNGs.
export function resolveAvatarImageUrl(nft) {
  if (!nft) return null
  const id = _extractAxieId(nft)
  if (id && isAxieNFT(nft)) return axieCdnUrl(id)
  return _preferAxieTransparentUrl(nft.imageUrl)
}

export async function loadNFTImage(url, nft = null) {
  const candidates = []
  const add = u => { if (u && !candidates.includes(u)) candidates.push(u) }

  if (nft && isAxieNFT(nft)) {
    for (const u of axieImageCandidates(nft)) add(u)
  } else {
    if (nft) add(resolveAvatarImageUrl(nft))
    add(_preferAxieTransparentUrl(url))
    add(url)
  }

  for (const u of candidates) {
    const img = await _loadOneUrl(u)
    if (img) return img
  }
  return null
}

export async function loadImageUrl(url) {
  if (!url) return null
  return _loadOneUrl(_preferAxieTransparentUrl(url) ?? url)
}

async function _loadOneUrl(url) {
  if (!url) return null
  const cid = _extractCID(url)
  if (cid) {
    for (const gw of IPFS_GATEWAYS) {
      const img = await _tryLoadImage(gw + cid, GATEWAY_TIMEOUT, true)
      if (img) return img
    }
    return null
  }
  // Non-IPFS: proxy the URL so the response arrives from our origin,
  // enabling canvas pixel reads without a tainted-canvas error.
  const proxied = _proxyUrl(url)
  const corsImg = await _tryLoadImage(proxied, IMG_TIMEOUT, true)
  if (corsImg) return corsImg
  // Fallback: try un-proxied without crossOrigin (display-only — canvas baking
  // will still fail, but at least the image loads for the picker UI).
  return _tryLoadImage(url, IMG_TIMEOUT, false)
}

// -- Resolve a URL to the first working HTTP URL string --------------
// Used by avatarPicker to get a src it can assign to an <img>.
// Returns a URL string on success, null if all attempts fail.
export async function resolveImageUrl(url) {
  if (!url) return null
  const cid = _extractCID(url)
  if (cid) {
    for (const gw of IPFS_GATEWAYS) {
      const img = await _tryLoadImage(gw + cid, GATEWAY_TIMEOUT)
      if (img) return img.src
    }
    return null
  }
  // Plain HTTP URL -- verify it loads before returning it
  const img = await _tryLoadImage(url, IMG_TIMEOUT)
  return img ? img.src : null
}

// -- Internal helpers ------------------------------------------------

// Load one image with a timeout. Returns HTMLImageElement or null.
// crossOrigin should only be true when the image will be drawn to a canvas
// (e.g. avatarCache baking). Setting it for display-only <img> elements
// causes CDNs that don't send CORS headers to reject the request.
function _tryLoadImage(httpUrl, timeoutMs, crossOrigin = false) {
  return new Promise(resolve => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => { img.src = ''; resolve(null) }, timeoutMs)
    img.onload  = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = httpUrl
  })
}

// Extract the IPFS CID (+ optional path) from any IPFS-flavoured URL:
//   ipfs://CID/path          -> "CID/path"
//   https://*/ipfs/CID/path  -> "CID/path"  (covers cloudflare, Pinata, ipfs.io ...)
export function isAxieNFT(nft) {
  const c = (nft.contractAddress || '').toLowerCase()
  const name = (nft.collectionName || '').toLowerCase()
  const img = (nft.imageUrl || '').toLowerCase()
  return AXIE_CONTRACTS.has(c) || name.includes('axie') || img.includes('axiecdn.axieinfinity.com')
}

function _extractAxieId(nft) {
  const tid = String(nft.tokenId ?? '')
  if (/^\d+$/.test(tid)) return tid
  const m = (nft.imageUrl || '').match(/axies\/(\d+)\//i)
  return m ? m[1] : null
}

function _preferAxieTransparentUrl(url) {
  if (!url) return null
  if (!url.includes('axiecdn.axieinfinity.com')) return url
  if (url.includes('transparent')) return url
  return url
    .replace(/axie-full(?:-portrait)?\.(?:png|jpg|jpeg|webp)/i, 'axie-full-transparent.png')
}

function _extractCID(url) {
  if (!url) return null
  if (url.startsWith('ipfs://')) return url.slice(7)
  const m = url.match(/\/ipfs\/(.+)/)
  return m ? m[1] : null
}

function _normalise(raw) {
  const nm       = raw.normalized_metadata ?? {}
  const raw_meta = _tryParse(raw.metadata)

  const imageUrl =
    nm.image                               ||
    raw_meta?.image                        ||
    raw.media?.original_media_url          ||
    raw.media?.media_collection?.high?.url ||
    raw.media?.media_collection?.low?.url  ||
    null

  const thumbnailUrl =
    raw.media?.media_collection?.low?.url  ||
    raw.media?.media_collection?.high?.url ||
    imageUrl

  const nft = {
    id:             `${raw.token_address}:${raw.token_id}`,
    tokenId:        raw.token_id,
    contractAddress:raw.token_address,
    name:           nm.name || raw_meta?.name || `#${raw.token_id}`,
    collectionName: raw.name || '',
    description:    nm.description || raw_meta?.description || '',
    imageUrl,
    thumbnailUrl,
    attributes:     nm.attributes || raw_meta?.attributes || [],
  }
  const avatarUrl = resolveAvatarImageUrl(nft)
  if (avatarUrl) nft.imageUrl = avatarUrl
  return nft
}

function _tryParse(str) {
  if (!str || typeof str !== 'string') return null
  try { return JSON.parse(str) } catch { return null }
}
