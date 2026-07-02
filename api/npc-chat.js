// api/npc-chat.js — Vercel Serverless Function
// Proxies NPC chat completions to Groq so the API key never ships in the
// client bundle (same pattern as api/graphql.js).
//
// POST /api/npc-chat  { model, messages, max_tokens, temperature }
// → forwards to api.groq.com/openai/v1/chat/completions with server-side key

const UPSTREAM = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_TOKENS_CAP = 300   // quota-abuse guard — NPC replies are short

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' })

  // Key lives server-side only (Vercel env var GROQ_API_KEY, no VITE_ prefix).
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: Math.min(body.max_tokens ?? MAX_TOKENS_CAP, MAX_TOKENS_CAP),
      }),
    })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    console.error('[npc-chat] upstream error:', err)
    return res.status(502).json({ error: 'Upstream request failed' })
  }
}
