// ═══════════════════════════════════════════════════════════════
// tradeOfferFlow.js — UI for creating a Seaport trade offer
// The Outlet — WebZone 001
//
// Opens a modal that lets Player A:
//   1. Pick one of their NFTs to offer         (#tof-my-list)
//   2. Pick one of Player B's NFTs to receive  (#tof-their-list)
// Then signs the Seaport order (off-chain) and sends it as a DM.
//
// Both grids are fetched via the same wallet-agnostic
// fetchWalletNFTs(address, cursor) pagination idiom.
//
// SECURITY (spec R1–R4, critic F8): NFT metadata — especially the
// counterparty's — is attacker-controlled. No metadata is ever
// interpolated into innerHTML; token IDs pass an allow-list; image
// URLs must be http(s); order-bound token IDs must be decimal.
//
// Depends on:
//   trade.js      -> createTradeOrder, serialiseOrder, getRoninProvider
//   dmService.js  -> sendMessage, sendToInbox
//   nftService.js -> fetchWalletNFTs
//   wallet.js     -> getAddress, shortAddress
// ═══════════════════════════════════════════════════════════════

import { createTradeOrder, serialiseOrder, getRoninProvider } from './trade.js'
import { safeTokenId, isDecimalTokenId } from './validation.js'
import { TRADE_EXPIRY_SEC } from './config.js'
import { sendMessage, sendToInbox } from './dmService.js'
import { fetchWalletNFTs } from './nftService.js'
import { getAddress, shortAddress } from './wallet.js'
import { getCollections, ChainId } from '@sky-mavis/mavis-market-core'

// Add contract addresses here (all lowercase) to make a collection tradeable.
// loadTradeableContracts() replaces this set at runtime with every ERC-721
// collection listed on Mavis Market, so manual entries are only needed as
// offline fallbacks.
export const TRADEABLE_CONTRACTS = new Set([
  '0x32950db2a7164ae833121501c797d79e7b79d74c', // Axies
])

const COLLECTION_BATCH = 100
const MAX_PAGES        = 20   // 20 pages x 24 NFTs = 480 NFTs max per wallet

// Fetch every ERC-721 collection from Mavis Market and replace TRADEABLE_CONTRACTS.
// Called once by dmPanel._requireTradeModules() before the trade UI opens.
// On error or empty result the set is left unchanged (offline fallback).
export async function loadTradeableContracts() {
  let from       = 0
  const found    = new Set()

  while (true) {
    const { erc721Collections } = await getCollections({
      chainId: ChainId.mainnet,
      from,
      size: COLLECTION_BATCH,
    })

    for (const col of erc721Collections) {
      if (col.tokenAddress) found.add(col.tokenAddress.toLowerCase())
    }

    if (erc721Collections.length < COLLECTION_BATCH) break
    from += COLLECTION_BATCH
  }

  if (found.size === 0) {
    console.warn('[tradeOfferFlow] Mavis Market returned no ERC-721 collections — keeping defaults')
    return
  }

  TRADEABLE_CONTRACTS.clear()
  for (const addr of found) TRADEABLE_CONTRACTS.add(addr)
  console.log(`[tradeOfferFlow] ${found.size} tradeable contracts loaded from Mavis Market`)
}

// Token-ID validation shared with dmPanel via validation.js (Phase 2.1)

let _overlay = null

// Build DOM (once)
function _ensureDOM() {
  if (_overlay) return
  _overlay = document.createElement('div')
  _overlay.id = 'trade-offer-overlay'
  _overlay.innerHTML = `
    <div id="tof-panel">
      <div id="tof-header">
        <span id="tof-title">Send Trade Offer</span>
        <button id="tof-close">✕</button>
      </div>
      <div id="tof-body">
        <p class="tof-label">YOUR NFT (offer)</p>
        <div id="tof-my-list" class="tof-grid"><span class="tof-loading">Loading NFTs…</span></div>
        <p class="tof-label">THEIR NFT (you receive)</p>
        <div id="tof-their-list" class="tof-grid"><span class="tof-loading">Loading NFTs…</span></div>
        <p class="tof-hint">⚠ Both of you need NFT contract approval. seaport-js handles this automatically.</p>
        <button id="tof-send" disabled>Sign &amp; Send Offer</button>
        <div id="tof-status"></div>
      </div>
    </div>
  `
  document.body.appendChild(_overlay)

  document.getElementById('tof-close').addEventListener('click', closeTradeOfferUI)
  document.getElementById('tof-panel').addEventListener('click', e => e.stopPropagation())
  _overlay.addEventListener('click', closeTradeOfferUI)
}

// State
let _theirAddr       = null
let _selectedNFT     = null   // mine (offer)
let _selectedWantNFT = null   // theirs (consideration)
let _sending         = false
// Critic F1: generation counter — invalidates in-flight fetches when the
// modal is closed or reopened, so a stale fetch can never render into the
// grids of a newer (possibly different-peer) session.
let _openGen = 0

// -- Sanitisers (spec R2/R3) -------------------------------------
// null fallback: invalid IDs are skipped entirely in the NFT grid
function _safeTokenId(val) {
  return safeTokenId(val, null)
}

function _safeImgUrl(url) {
  if (typeof url !== 'string' || !url) return null
  try {
    const u = new URL(url, window.location.href)
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href
  } catch { /* unparseable */ }
  return null
}

// -- Shared paginated NFT fetch (wallet-agnostic) ----------------
// Throws only if the FIRST page fails; mid-pagination errors are
// captured as partialError so the caller can render a partial grid.
async function _fetchAllNFTs(addr) {
  const allNfts = []
  let cursor       = null
  let pageCount    = 0
  let hitCap       = false
  let partialError = null

  while (pageCount < MAX_PAGES) {
    let result
    try {
      result = await fetchWalletNFTs(addr, cursor)
    } catch (err) {
      if (!allNfts.length) throw err   // nothing loaded — caller renders error
      partialError = err
      break
    }
    if (!result.nfts.length) break   // zero-items guard against stuck/malformed cursor
    allNfts.push(...result.nfts)
    pageCount++
    cursor = result.nextCursor
    if (!cursor) break
  }
  if (cursor && pageCount >= MAX_PAGES) hitCap = true

  const nfts = allNfts.filter(n =>
    TRADEABLE_CONTRACTS.has(n.contractAddress?.toLowerCase())
  )
  return { nfts, totalFetched: allNfts.length, pageCount, hitCap, partialError }
}

// Open
export async function openTradeOfferUI(theirAddr) {
  _ensureDOM()
  const gen = ++_openGen          // F1: new session generation
  _theirAddr       = theirAddr.toLowerCase()
  _selectedNFT     = null
  _selectedWantNFT = null         // F2: reset on open
  _sending         = false

  document.getElementById('tof-title').textContent =
    `Trade Offer → ${shortAddress(theirAddr)}`
  document.getElementById('tof-status').textContent = ''
  document.getElementById('tof-send').disabled = true
  for (const id of ['tof-my-list', 'tof-their-list']) {
    document.getElementById(id).innerHTML =
      '<span class="tof-loading">Loading NFTs…</span>'
  }

  _overlay.classList.add('on')

  // Wire send button (re-bind each open to avoid stale closures)
  document.getElementById('tof-send').onclick = _handleSend

  // Critic F3: each grid loads in its own never-throwing async task with
  // its own error rendering; both run concurrently. One wallet failing
  // (or being slow) never affects the other grid.
  const myAddr = getAddress()
  await Promise.all([
    _loadGrid(gen, 'tof-my-list', myAddr, {
      emptyText: 'No tradeable NFTs in wallet',
      onSelect:  nft => { _selectedNFT = nft; _updateSendButton() },
    }),
    _loadGrid(gen, 'tof-their-list', _theirAddr, {
      emptyText: 'They have no tradeable NFTs — trade not possible',
      onSelect:  nft => { _selectedWantNFT = nft; _updateSendButton() },
    }),
  ])
}

// Load one wallet into one grid. Never throws.
async function _loadGrid(gen, listId, addr, { emptyText, onSelect }) {
  try {
    const { nfts, totalFetched, pageCount, hitCap, partialError } =
      await _fetchAllNFTs(addr)
    if (gen !== _openGen) return   // F1: modal closed/reopened — discard

    const list = document.getElementById(listId)
    _renderNFTList(list, nfts, emptyText, onSelect)

    if (hitCap || partialError) {
      const warn = document.createElement('p')
      warn.className = 'tof-hint'
      warn.textContent = hitCap
        ? `⚠ Large collection — showing first ${totalFetched} NFTs only.`
        : `⚠ Partial load (${pageCount} page(s)): ${partialError.message}`
      list.appendChild(warn)
    }
  } catch (err) {
    if (gen !== _openGen) return
    const list = document.getElementById(listId)
    list.textContent = ''
    const span = document.createElement('span')
    span.className = 'tof-error'
    span.textContent = `Failed to load NFTs: ${err.message}`
    list.appendChild(span)
  }
}

export function closeTradeOfferUI() {
  _openGen++                      // F1: invalidate in-flight fetches
  _overlay?.classList.remove('on')
  _theirAddr = null; _selectedNFT = null; _selectedWantNFT = null   // F2
}

export function isTradeOfferUIOpen() {
  return !!_overlay?.classList.contains('on')
}

// Render an NFT grid — DOM construction only, no innerHTML with
// interpolated metadata (spec R1). Cards with non-allow-listed token
// IDs are skipped (R2); image URLs must parse as http(s) (R3).
function _renderNFTList(list, nfts, emptyText, onSelect) {
  list.textContent = ''
  let rendered = 0

  nfts.forEach(nft => {
    const tokenId = _safeTokenId(nft.tokenId)
    if (!tokenId) {
      console.warn('[tradeOfferFlow] skipping NFT with invalid token ID:', nft.tokenId)
      return
    }

    const card = document.createElement('div')
    card.className = 'tof-nft-card'
    card.dataset.tokenId = tokenId

    const imgUrl = _safeImgUrl(nft.imageUrl)
    if (imgUrl) {
      const img = document.createElement('img')
      img.alt = '#' + tokenId
      img.loading = 'lazy'
      img.src = imgUrl
      card.appendChild(img)
    }

    const label = document.createElement('span')
    label.textContent = '#' + tokenId
    card.appendChild(label)

    card.addEventListener('click', () => {
      // Selection highlight is scoped to THIS grid only
      list.querySelectorAll('.tof-nft-card').forEach(c => c.classList.remove('sel'))
      card.classList.add('sel')
      onSelect(nft)
    })
    list.appendChild(card)
    rendered++
  })

  if (!rendered) {
    const span = document.createElement('span')
    span.className = 'tof-empty'
    span.textContent = emptyText
    list.appendChild(span)
  }
}

function _updateSendButton() {
  document.getElementById('tof-send').disabled =
    !_selectedNFT || !_selectedWantNFT || _sending
}

// Send handler
async function _handleSend() {
  if (_sending) return
  if (!_selectedNFT || !_selectedWantNFT) return

  // Spec R4 / critic F4: both order-bound token IDs must be decimal
  // uint256 strings. Abort visibly otherwise — never sign a crafted ID.
  const offerId = String(_selectedNFT.tokenId)
  const wantId  = String(_selectedWantNFT.tokenId)
  const status  = document.getElementById('tof-status')
  if (!isDecimalTokenId(offerId) || !isDecimalTokenId(wantId)) {
    status.textContent = '❌ Invalid token ID — cannot build order'
    console.warn('[tradeOfferFlow] non-decimal token ID rejected:', { offerId, wantId })
    return
  }

  _sending = true
  document.getElementById('tof-send').disabled = true
  status.textContent = '⏳ Requesting wallet signature…'

  try {
    const myAddr   = getAddress()
    const provider = getRoninProvider()
    const signer   = await provider.getSigner()

    const wantNFT = {
      contractAddress: _selectedWantNFT.contractAddress,
      tokenId:         wantId,
    }

    const endTime = Math.floor(Date.now() / 1000) + TRADE_EXPIRY_SEC

    const { order, orderHash } = await createTradeOrder(
      [_selectedNFT],
      [wantNFT],
      myAddr,
      signer,
      endTime,
    )

    status.textContent = '📤 Sending offer…'

    await sendMessage(_theirAddr, {
      type: 'trade_offer',
      content: `Trade offer: NFT #${offerId} for NFT #${wantId}`,
      trade_payload: {
        orderJson:             serialiseOrder(order),
        orderHash,
        offerTokenId:          offerId,
        considerationTokenId:  wantId,
        endTime,
      },
    })

    // Notify recipient's inbox channel (best-effort; do not await).
    // Finding 7: .toLowerCase() on myAddr before inbox payload -- getAddress()
    // may return EIP-55 checksum form; _theirAddr is already lowercase.
    const summary = `NFT #${offerId} for #${wantId}`
    sendToInbox(_theirAddr, {
      from:    myAddr.toLowerCase(),
      type:    'trade_offer',
      summary,
      ts:      Date.now(),
    }).catch(err => console.warn('[tradeOfferFlow] inbox notify failed:', err))

    status.textContent = '✅ Offer sent!'
    _sending = false
    _updateSendButton()
    setTimeout(closeTradeOfferUI, 1500)

  } catch (err) {
    console.error('[tradeOfferFlow] send failed:', err)
    status.textContent = `❌ ${err.message}`
    _sending = false
    _updateSendButton()
  }
}
