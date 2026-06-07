// api/img-proxy.js — Vercel Edge Function
// Proxies NFT images from whitelisted CDNs so the response arrives from our
// own origin, enabling canvas pixel reads without a tainted-canvas error.
//
// GET /api/img-proxy?src=<encoded-url>
//
// Responses:
//   200  image bytes, Access-Control-Allow-Origin: *, Cache-Control: 24h
//   400  missing or unparseable src
//   403  protocol not https, or hostname not whitelisted
//   502  upstream returned non-2xx or unreachable
//   504  upstream fetch timed out (8 s hard limit)

export const config = { runtime: 'edge' }

// Hostnames of CDNs that serve NFT assets for Ronin / Axie projects.
// Keep in sync with IPFS_GATEWAYS in src/nftService.js.
// NOTE: storage.googleapis.com is broad — matches any public GCS bucket.
// IPFS gateways are included for completeness; _loadOneUrl in nftService.js
// bypasses the proxy for CID URLs so these entries are defensive only.
const ALLOWED_HOSTS = new Set([
  'ww-nft-static.sfo3.cdn.digitaloceanspaces.com',
  'axiecdn.axieinfinity.com',
  'cdn.skymavis.com',
  'storage.googleapis.com',       // broad — any public GCS bucket
  'ipfs.io',
  'dweb.link',
  'nftstorage.link',
  'cloudflare-ipfs.com',
  'gateway.pinata.cloud',
  'ipfs.4everland.io',
  // ADD NEW RONIN COLLECTION CDN DOMAINS HERE
])

export default async function handler(request) {
  const { searchParams } = new URL(request.url)
  const src = searchParams.get('src')

  if (!src) {
    return new Response(JSON.stringify({ error: 'missing src param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let srcUrl
  try {
    srcUrl = new URL(src)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid src url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Explicit protocol allowlist — defense-in-depth before hostname check.
  // javascript:, data:, file: all resolve to hostname "" which would already
  // be blocked by the whitelist, but an explicit check is more robust.
  if (srcUrl.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'only https urls allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!ALLOWED_HOSTS.has(srcUrl.hostname)) {
    return new Response(JSON.stringify({ error: 'domain not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let upstream
  try {
    upstream = await fetch(src, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),  // 8 s hard limit — prevents stalled isolates
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return new Response(JSON.stringify({ error: 'upstream timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'upstream unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Re-check post-redirect URL: a whitelisted CDN could redirect to an http://
  // endpoint or an off-whitelist domain.
  const finalUrl = new URL(upstream.url)
  if (finalUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(finalUrl.hostname)) {
    return new Response(JSON.stringify({ error: 'redirect to disallowed url' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: 'upstream error', status: upstream.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const contentType =
    upstream.headers.get('content-type') ?? 'application/octet-stream'

  // Stream body directly — avoids buffering the full image in the edge isolate
  // (128 MB memory limit, shared across concurrent requests).
  // Trade-off: if the upstream connection drops mid-stream, the client receives
  // a truncated body; the HTTP 200 status is already committed by that point.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      // Cache-Control is set here; do NOT duplicate in vercel.json headers block
      // (vercel.json headers overwrite the function value and would drop stale-while-revalidate).
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
