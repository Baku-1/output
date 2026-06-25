// ═══════════════════════════════════════════════════════════════
// avatarPicker.js — NFT avatar selection UI
// The Outlet — WebZone 001
//
// Shows after wallet connect. Fetches the player's Ronin NFTs
// via Moralis, displays them in a grid, lets the player pick one
// (or skip to use a procedural avatar).
//
// On selection: stores the image URL in sessionStorage and clears
// the IDB cache entry so loadPlayerAvatar picks up the new choice.
//
// Non-humanoid / broken image fallback:
//   Each card attempts to load its thumbnail. If it fails, the
//   card shows a "No preview" placeholder. The player can still
//   select that NFT — the full image URL is tried at bake time.
//   If that also fails, makeProceduralAvatar() is used instead.
// ═══════════════════════════════════════════════════════════════

import { fetchWalletNFTs, resolveImageUrl, resolveAvatarImageUrl, isAxieNFT } from './nftService.js'
import { avatarCache, makeProceduralAvatar } from './avatarCache.js'

// SVG silhouette shown when every gateway fails for a given NFT thumbnail.
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23334155'/%3E%3Ccircle cx='40' cy='28' r='14' fill='%2394a3b8'/%3E%3Cellipse cx='40' cy='72' rx='24' ry='18' fill='%2394a3b8'/%3E%3C/svg%3E`

// ── Show the picker ───────────────────────────────────────────
// Returns a Promise that resolves when the player has made a
// selection (or skipped). Resolves with the chosen imageUrl
// (string) or null (procedural).
export function showAvatarPicker(address) {
  console.log('[PICKER] showAvatarPicker() entered, address:', address)
  return new Promise(resolve => {
    console.log('[PICKER] inside Promise constructor')
    const el = document.getElementById('avatar-picker')
    console.log('[PICKER] #avatar-picker element:', el)
    if (!el) {
      console.warn('[PICKER] #avatar-picker NOT FOUND in DOM — resolving null immediately (picker promise will resolve but no UI shown)')
      return resolve(null)
    }

    console.log('[PICKER] setting display:flex on picker')
    el.style.display = 'flex'
    console.log('[PICKER] calling _render()')
    _render(el, address, resolve)
    console.log('[PICKER] _render() called (async, not yet awaited)')
  })
}

// ── Render / re-render the picker ─────────────────────────────
async function _render(el, address, resolve, cursor = null) {
  console.log('[PICKER] _render() entered, cursor:', cursor)
  const body = el.querySelector('.ap-body')
  const more = el.querySelector('#ap-more')
  console.log('[PICKER] .ap-body element:', body, '| #ap-more element:', more)

  if (!cursor) {
    console.log('[PICKER] first load — showing spinner')
    body.innerHTML = '<div class="ap-spinner">Loading your NFTs…</div>'
    more.style.display = 'none'
  }

  console.log('[PICKER] calling fetchWalletNFTs()')
  let result
  try {
    result = await fetchWalletNFTs(address, cursor)
    console.log('[PICKER] fetchWalletNFTs() resolved:', result)
  } catch (err) {
    console.error('[PICKER] fetchWalletNFTs() threw:', err)
    body.innerHTML = `<div class="ap-error">Could not load NFTs.<br><small>${err.message}</small></div>`
    return
  }

  if (!cursor) body.innerHTML = ''

  if (result.nfts.length === 0 && !cursor) {
    console.log('[PICKER] no NFTs found on wallet')
    body.innerHTML = '<div class="ap-empty">No NFTs found on this wallet.</div>'
  }

  console.log('[PICKER] rendering', result.nfts.length, 'NFT cards')
  for (const nft of result.nfts) {
    body.appendChild(_makeCard(nft, address, resolve))
  }

  if (result.nextCursor) {
    console.log('[PICKER] nextCursor present — showing Load More button')
    more.style.display = 'block'
    more.onclick = () => {
      more.style.display = 'none'
      _render(el, address, resolve, result.nextCursor)
    }
  } else {
    console.log('[PICKER] no nextCursor — all NFTs loaded')
    more.style.display = 'none'
  }
  console.log('[PICKER] _render() complete — picker is now waiting for user to click a card or skip')
}

// ── Build a single NFT card ───────────────────────────────────
function _makeCard(nft, address, resolve) {
  const card = document.createElement('div')
  card.className = 'ap-card'
  card.title = `${nft.collectionName}\n${nft.name}`

  // Thumbnail — resolve through IPFS gateway fallback chain asynchronously.
  // The card renders immediately with a placeholder; the real image swaps in
  // once a gateway responds (or stays as placeholder if all fail).
  const thumbWrap = document.createElement('div')
  thumbWrap.className = 'ap-thumb-wrap'

  const img = document.createElement('img')
  img.className = 'ap-thumb'
  img.alt = nft.name
  img.src = PLACEHOLDER_SVG   // instant paint; replaced below if a gateway works
  thumbWrap.appendChild(img)

  const noPreview = document.createElement('div')
  noPreview.className = 'ap-no-preview'
  noPreview.style.display = 'none'

  if (nft.thumbnailUrl) {
    resolveImageUrl(nft.thumbnailUrl).then(resolvedUrl => {
      if (resolvedUrl) {
        img.src = resolvedUrl
      }
      // If null, the SVG silhouette already showing is fine — picker is still usable.
    })
  }

  const label = document.createElement('div')
  label.className = 'ap-label'
  label.textContent = nft.name

  const sub = document.createElement('div')
  sub.className = 'ap-sub'
  sub.textContent = nft.collectionName

  card.appendChild(thumbWrap)
  card.appendChild(noPreview)
  card.appendChild(label)
  card.appendChild(sub)

  card.addEventListener('click', () => _select(nft, address, resolve))
  return card
}

// ── Handle selection ──────────────────────────────────────────
async function _select(nft, address, resolve) {
  console.log('[PICKER] _select() entered — nft:', nft.name, '| imageUrl:', nft.imageUrl)
  const avatarUrl = resolveAvatarImageUrl(nft) || nft.imageUrl
  const axie = isAxieNFT(nft)
  if (avatarUrl) {
    sessionStorage.setItem(`avatar-url:${address}`, avatarUrl)
    console.log('[PICKER] stored avatar-url in sessionStorage:', avatarUrl)
  } else {
    sessionStorage.removeItem(`avatar-url:${address}`)
    console.log('[PICKER] no imageUrl — removed avatar-url from sessionStorage')
  }
  if (axie) sessionStorage.setItem(`avatar-is-axie:${address}`, '1')
  else sessionStorage.removeItem(`avatar-is-axie:${address}`)

  console.log('[PICKER] clearing avatar cache...')
  await avatarCache.clear(address)
  console.log('[PICKER] cache cleared — resolving picker promise with:', nft.imageUrl || null)
  window.dispatchEvent(new CustomEvent('avatar-changed', { detail: { address } }))

  _close()
  resolve(avatarUrl || null)
}

// ── Skip / procedural ─────────────────────────────────────────
export function setupPickerSkip(address, resolve) {
  const skipBtn = document.getElementById('ap-skip')
  console.log('[PICKER] setupPickerSkip() — #ap-skip element:', skipBtn)
  skipBtn?.addEventListener('click', async () => {
    console.log('[PICKER] skip button clicked — resolving picker promise with null')
    sessionStorage.removeItem(`avatar-url:${address}`)
    sessionStorage.removeItem(`avatar-is-axie:${address}`)
    await avatarCache.clear(address)
    window.dispatchEvent(new CustomEvent('avatar-changed', { detail: { address } }))
    _close()
    resolve(null)
  })
}

function _close() {
  const el = document.getElementById('avatar-picker')
  if (el) el.style.display = 'none'
}
