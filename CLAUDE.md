# The Outlet — WebZone 001

@claude-state.md

Multiplayer Web3 game mall on Ronin: a 3D raycaster environment where players
connect a Ronin wallet, walk around as their NFT avatars, chat, trade
peer-to-peer, and launch into games from storefronts.

Note: `claude-state.md` (imported above) is the local-only session state file —
it is gitignored and does not exist in fresh clones or remote sessions. Durable
project knowledge belongs here; in-progress session notes belong there.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173 (needs a `.env`, see README)
- `npm run build` / `npm run preview` — production build / preview
- `npm test` — Vitest, single run (`npx vitest` to watch). Tests live next to
  their modules in `src/` (`trade.test.js`, `tradeOfferFlow.test.js`, `validation.test.js`)

## Architecture

- **No engine, no framework.** The renderer is a hand-written DDA raycaster in
  vanilla JS (`src/renderer.js`): floor/ceiling cast, wall DDA with a z-buffer,
  billboard sprite cast. Sprites (players, NPCs) must sort against the z-buffer.
  The world grid lives in `src/map.js`.
- **Multiplayer** is Ably Realtime (`src/multiplayer.js`) — position broadcast,
  DMs (`dmPanel.js`/`dmService.js`), group chat (`groupChat.js`), trade inbox.
- **Wallet** is Ronin via `@sky-mavis/tanto-connect` (`src/wallet.js`) —
  extension, mobile, and Waypoint flows.
- **Trading** is Seaport 1.6 on Ronin mainnet (`src/trade.js`,
  `src/tradeOfferFlow.js`, validated by `src/validation.js`). Treat this as
  financial code: validate → compute → update state → external interaction, always.
- **Avatars**: Axie NFTs get full animated Spine rigs via `@axieinfinity/mixer`
  + `pixi-spine` (`spineAvatar.js`, `spineAvatarManager.js`); other collections
  get a 6-bone canvas rig (`genericSpineAvatar.js`) or a static bake. Static
  bakes are cached in IndexedDB (`avatarCache.js`); Spine instances stay live.
- **NPCs** (`src/npcs.js`): character registry with per-character system prompts
  (personality lives in the `systemPrompt` field), placed by world coordinates.
  Chat goes through Groq via the `api/npc-chat.js` proxy.

## Serverless / API keys

- `api/` holds Vercel serverless functions. API keys never ship in the client
  bundle: in dev, `vite.config.js` proxies `/api/graphql` to the Sky Mavis
  gateway and attaches the key server-side; in production `api/graphql.js` and
  `api/npc-chat.js` do the same with non-`VITE_` env vars in Vercel.
- Required env vars are listed in the README Quick Start.

## Conventions

- Scope: Ronin-only for beta. Don't add other chains without being asked.
- Vanilla JS modules, no TypeScript, no bundler magic beyond Vite defaults.
- Deploy target is Vercel (`vercel.json`).
