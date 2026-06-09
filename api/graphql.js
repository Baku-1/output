// api/graphql.js — Vercel Serverless Function (Node.js / AWS Lambda)
// Proxies Sky Mavis Axie GraphQL so the browser never directly requests
// graphql-gateway.axieinfinity.com, which is Cloudflare-protected against
// direct browser calls. Serverless (AWS Lambda IPs) bypasses the CF block
// that Edge Functions (Cloudflare Worker IPs) trigger.
//
// POST /api/graphql  { operationName, variables, query }
// → forwards to graphql-gateway.axieinfinity.com/graphql

const UPSTREAM = 'https://graphql-gateway.axieinfinity.com/graphql'

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // API key lives server-side only (Vercel env var SKY_MAVIS_API_KEY, no VITE_ prefix).
  const apiKey = process.env.SKY_MAVIS_API_KEY || process.env.VITE_SKY_MAVIS_API_KEY

  // req.body is already parsed by Vercel when Content-Type is application/json
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

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
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? 'upstream timeout' : 'upstream unreachable',
    })
  }

  const text = await upstream.text()
  res.setHeader('Content-Type', 'application/json')
  return res.status(upstream.status).send(text)
}
