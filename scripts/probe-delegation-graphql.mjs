#!/usr/bin/env node
// scripts/probe-delegation-graphql.mjs
// Discovers delegation-related queries on the Sky Mavis Axie GraphQL gateway
// (the same upstream api/graphql.js proxies). Run from a machine with normal
// network access:
//
//   SKY_MAVIS_API_KEY=xxx node scripts/probe-delegation-graphql.mjs
//   node scripts/probe-delegation-graphql.mjs --url https://<deployment>/api/graphql
//
// Reads VITE_SKY_MAVIS_API_KEY / SKY_MAVIS_API_KEY from the environment or a
// local .env file. With --url pointing at our deployed proxy no key is needed
// (the proxy attaches it server-side).
//
// Strategy:
//   1. Introspect Query fields and report anything matching /delegat/i,
//      with full argument and return-type signatures.
//   2. Introspect schema types matching /delegat/i and dump their fields.
//   3. If introspection is disabled, probe candidate field names one by one —
//      "Cannot query field" errors prove absence; argument/validation errors
//      prove existence.

import { readFileSync } from 'node:fs'

const UPSTREAM = 'https://api-gateway.skymavis.com/graphql/axie-marketplace'

const CANDIDATE_FIELDS = [
  'delegations',
  'axieDelegations',
  'ownershipDelegations',
  'delegatedAxies',
  'delegationsByDelegatee',
  'delegatedToMe',
  'delegatedToOthers',
  'axieDelegationsByDelegatee',
]

function loadDotEnvKey() {
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    const m = env.match(/^(?:VITE_)?SKY_MAVIS_API_KEY=(.+)$/m)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

const urlArgIdx = process.argv.indexOf('--url')
const url = urlArgIdx !== -1 ? process.argv[urlArgIdx + 1] : UPSTREAM
const apiKey =
  process.env.SKY_MAVIS_API_KEY || process.env.VITE_SKY_MAVIS_API_KEY || loadDotEnvKey()

if (url === UPSTREAM && !apiKey) {
  console.error(
    'No API key found. Set SKY_MAVIS_API_KEY, add it to .env, or use --url <deployed /api/graphql>.',
  )
  process.exit(1)
}

async function gql(query, variables = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  const text = await res.text()
  try {
    return { status: res.status, json: JSON.parse(text) }
  } catch {
    return { status: res.status, json: null, text: text.slice(0, 500) }
  }
}

function typeName(t) {
  // Render an introspection TypeRef like [AxieDelegation!]!
  if (!t) return '?'
  if (t.kind === 'NON_NULL') return `${typeName(t.ofType)}!`
  if (t.kind === 'LIST') return `[${typeName(t.ofType)}]`
  return t.name
}

const TYPE_REF = 'kind name ofType { kind name ofType { kind name ofType { kind name } } }'

async function introspectQueryFields() {
  const q = `query {
    __schema {
      queryType {
        fields {
          name
          args { name type { ${TYPE_REF} } }
          type { ${TYPE_REF} }
        }
      }
    }
  }`
  const { status, json, text } = await gql(q)
  if (!json?.data) {
    console.log(`Introspection of Query fields failed (HTTP ${status}):`)
    console.log(JSON.stringify(json?.errors ?? text, null, 2))
    return null
  }
  return json.data.__schema.queryType.fields
}

async function introspectMatchingTypes() {
  const q = `query { __schema { types { name kind } } }`
  const { json } = await gql(q)
  const all = json?.data?.__schema?.types
  if (!all) return
  const hits = all.filter((t) => /delegat/i.test(t.name))
  if (!hits.length) {
    console.log('\nNo schema types matching /delegat/i.')
    return
  }
  for (const t of hits) {
    const detail = await gql(
      `query ($name: String!) {
        __type(name: $name) {
          name kind
          fields { name type { ${TYPE_REF} } }
          inputFields { name type { ${TYPE_REF} } }
          enumValues { name }
        }
      }`,
      { name: t.name },
    )
    const ty = detail.json?.data?.__type
    console.log(`\ntype ${ty.name} (${ty.kind})`)
    for (const f of ty.fields ?? ty.inputFields ?? []) {
      console.log(`  ${f.name}: ${typeName(f.type)}`)
    }
    for (const v of ty.enumValues ?? []) console.log(`  ${v.name}`)
  }
}

async function probeCandidates() {
  console.log('\nIntrospection unavailable — probing candidate field names:')
  for (const name of CANDIDATE_FIELDS) {
    const { json } = await gql(`query { ${name} { __typename } }`)
    const msg = json?.errors?.[0]?.message ?? ''
    if (/cannot query field/i.test(msg)) {
      console.log(`  ✗ ${name}`)
    } else {
      // Anything else (missing required args, auth, subfield errors) means
      // the field exists — the validator got past name resolution.
      console.log(`  ✓ ${name} — ${msg || 'resolved'}`)
    }
  }
}

console.log(`Probing ${url}\n`)

process.on('unhandledRejection', (err) => {
  console.error(`Request failed: ${err?.cause?.message ?? err.message}`)
  process.exit(1)
})

const fields = await introspectQueryFields()
if (fields) {
  const hits = fields.filter(
    (f) => /delegat/i.test(f.name) || f.args.some((a) => /delegat/i.test(a.name)),
  )
  if (hits.length) {
    console.log('Query fields matching /delegat/i:')
    for (const f of hits) {
      const args = f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(', ')
      console.log(`  ${f.name}(${args}): ${typeName(f.type)}`)
    }
  } else {
    console.log('No Query fields match /delegat/i. All fields, for eyeballing:')
    console.log('  ' + fields.map((f) => f.name).sort().join('\n  '))
  }
  // Also inspect the args of axies(...) — delegation may be a filter flag.
  const axies = fields.find((f) => f.name === 'axies')
  if (axies) {
    console.log('\naxies(...) arguments:')
    for (const a of axies.args) console.log(`  ${a.name}: ${typeName(a.type)}`)
  }
  await introspectMatchingTypes()
} else {
  await probeCandidates()
}
