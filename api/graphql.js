// api/graphql.js — Vercel Edge Function
// Proxies Sky Mavis Axie GraphQL so the browser never directly requests
// graphql-gateway.axieinfinity.com, which is Cloudflare-protected against
// direct browser calls. Server-to-server (Vercel → gateway) is allowed.
//
// POST /api/graphql  { operationName, variables, query }
// → forwards to graphql-gateway.axieinfinity.com/graphql

export const config = { runtime: 'edge' }

const UPSTREAM = 'https://graphql-gateway.axieinfinity.com/graphql'

export default async function handler(request) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // API key: browser-forwarded header takes precedence; fall back to server env.
  // In dev the Vite proxy forwards the x-api-key set by avatarCache.js.
  // In production the Vercel env var is the authoritative source.
  const apiKey =
    request.headers.get('x-api-key') ||
    process.env.VITE_SKY_MAVIS_API_KEY

  let body
  try {
    body = await request.text()
  } catch {
    return new Response(JSON.stringify({ error: 'bad request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  let upstream
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body,
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    return new Response(
      JSON.stringify({ error: isTimeout ? 'upstream timeout' : 'upstream unreachable' }),
      { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
