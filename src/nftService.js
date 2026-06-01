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
export async function loadNFTImage(url) {
  if (!url) return null
  const cid = _extractCID(url)
  if (cid) {
    for (const gw of IPFS_GATEWAYS) {
      const img = await _tryLoadImage(gw + cid, GATEWAY_TIMEOUT, true)
      if (img) return img
    }
    return null
  }
  return _tryLoadImage(url, IMG_TIMEOUT, true)
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

  return {
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
}

function _tryParse(str) {
  if (!str || typeof str !== 'string') return null
  try { return JSON.parse(str) } catch { return null }
}
