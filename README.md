# NEXUS — WebZone 001
### The World's First Multiplayer Web3 Game Mall

Built with a Wolfenstein-style DDA raycaster, Supabase Realtime multiplayer,
Ronin Wallet via Tanto Kit/wagmi, and IndexedDB NFT avatar caching.

---

## Stack

| Layer | Tech |
|---|---|
| Renderer | Vanilla JS DDA raycaster (no engine) |
| Multiplayer | Supabase Realtime broadcast channels |
| Wallet | Ronin Wallet via `@sky-mavis/tanto-kit` + `wagmi` |
| Avatar cache | IndexedDB (Blob storage, 7-day TTL) |
| NFT resolution | Sky Mavis Marketplace API |
| Build | Vite 5 |
| Deploy | Netlify |

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — requires Ronin Wallet browser extension.

---

## Before You Deploy

### 1. Sky Mavis API Key
Get a key from [developer.skymavis.com](https://developer.skymavis.com)
and add it to `src/config.js`:
```js
export const SKY_MAVIS_API_KEY = 'your_key_here'
```

### 2. Anthropic API Key (AI Guide)
The guide calls the Anthropic API directly from the client right now.
**In production, proxy this through a backend route** so the key isn't
exposed. Replace the fetch in `src/main.js`:
```js
// Change this:
const res = await fetch('https://api.anthropic.com/v1/messages', ...)

// To your own backend:
const res = await fetch('/api/guide', { method:'POST', body: JSON.stringify({ messages: gHist }) })
```

### 3. WalletConnect (optional)
To support Ronin mobile / WalletConnect, add a project ID from
[cloud.walletconnect.com](https://cloud.walletconnect.com) and uncomment
the `walletConnectRonin` connector in `src/wallet.js`.

---

## Project Structure

```
nexus-webzone/
├── index.html          — shell, all UI markup
├── vite.config.js
├── src/
│   ├── main.js         — game loop, input, UI wiring, AI guide
│   ├── renderer.js     — DDA raycaster, sprite caster, minimap
│   ├── map.js          — tile map, store data, zone lookup
│   ├── multiplayer.js  — Supabase Realtime, remoteCache, lerp
│   ├── wallet.js       — Tanto Kit / wagmi Ronin connector
│   ├── avatarCache.js  — IndexedDB NFT pipeline (Gemini arch)
│   ├── config.js       — all constants and API keys
│   └── styles.css      — all UI styles
```

---

## Mall Layout

```
              ⚔ BATTLE WING (north)
                 Axie · Gods Unchained
                       |
🗡 RPG WING ── FOOD COURT ── 🏗 STRATEGY WING
Illuvium              |            Sandbox · Star Atlas
Big Time         MAIN HALL
              Decentral · Splinterlands
                       |
                    LOBBY  ← start here
```

---

## Multiplayer Architecture (per Gemini)

```
[Supabase Realtime WS] → (async 30Hz) → [remoteCache{}]
                                                |
                                         (read at 60fps)
                                                ↓
[renderFrame()] → Floor/Ceiling → Wall DDA+zBuf → Sprite Cast
```

Remote players are billboard sprites occluded by the z-buffer.
Avatar textures load from IndexedDB (or Sky Mavis API on cache miss)
and are injected into `remoteCache[addr].texture` when ready.
HSL color avatar is the fallback while textures load.

---

## Deploy to Netlify

```bash
npm run build
# drag dist/ folder to Netlify, or connect repo for CI/CD
```

Add environment variables in Netlify dashboard if you move API keys server-side.
