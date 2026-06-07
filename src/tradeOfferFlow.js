// ═══════════════════════════════════════════════════════════════
// tradeOfferFlow.js — UI for creating a Seaport trade offer
// The Outlet — WebZone 001
//
// Opens a modal that lets Player A:
//   1. Pick one of their Axies to offer
//   2. Enter the token ID they want from Player B
// Then signs the Seaport order (off-chain) and sends it as a DM.
//
// Depends on:
//   trade.js      -> createTradeOrder, serialiseOrder, getRoninProvider
//   dmService.js  -> sendMessage
//   nftService.js -> fetchWalletNFTs
//   wallet.js     -> getAddress
// ═══════════════════════════════════════════════════════════════

import { createTradeOrder, serialiseOrder, getRoninProvider } from './trade.js'
import { sendMessage } from './dmService.js'
import { fetchWalletNFTs } from './nftService.js'
import { getAddress, shortAddress } from './wallet.js'

const AXIE_CONTRACT = '0x32950db2a7164ae833121501c797d79e7b79d74c'

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
        <p class="tof-label">YOUR AXIE (offer)</p>
        <div id="tof-nft-list"><span class="tof-loading">Loading NFTs…</span></div>
        <p class="tof-label">TOKEN ID YOU WANT</p>
        <input id="tof-want-id" type="text" placeholder="e.g. 12345678" autocomplete="off" />
        <p class="tof-hint">⚠ Both of you need Axie contract approval. seaport-js handles this automatically.</p>
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
let _theirAddr    = null
let _selectedNFT  = null
let _sending      = false

// Open
export async function openTradeOfferUI(theirAddr) {
  _ensureDOM()
  _theirAddr   = theirAddr.toLowerCase()
  _selectedNFT = null
  _sending     = false

  document.getElementById('tof-title').textContent =
    `Trade Offer → ${shortAddress(theirAddr)}`
  document.getElementById('tof-want-id').value = ''
  document.getElementById('tof-status').textContent = ''
  document.getElementById('tof-send').disabled = true
  document.getElementById('tof-nft-list').innerHTML =
    '<span class="tof-loading">Loading NFTs…</span>'

  _overlay.classList.add('on')

  // Wire send button (re-bind each open to avoid stale closures)
  const sendBtn = document.getElementById('tof-send')
  sendBtn.onclick = _handleSend

  // Load player's NFTs — paginate through all pages (hard cap: MAX_PAGES)
  const MAX_PAGES = 20   // 20 pages x 24 NFTs = 480 NFTs max
  try {
    const myAddr  = getAddress()
    const allNfts = []
    let cursor       = null
    let pageCount    = 0
    let hitCap       = false
    let partialError = null

    while (pageCount < MAX_PAGES) {
      let result
      try {
        result = await fetchWalletNFTs(myAddr, cursor)
      } catch (err) {
        if (!allNfts.length) throw err   // nothing loaded — let outer catch render error
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

    const axies = allNfts.filter(n =>
      n.contractAddress?.toLowerCase() === AXIE_CONTRACT
    )
    _renderNFTList(axies)

    if (hitCap || partialError) {
      const nftList = document.getElementById('tof-nft-list')
      const warn = document.createElement('p')
      warn.className = 'tof-hint'
      warn.textContent = hitCap
        ? `⚠ Large collection — showing first ${allNfts.length} NFTs only.`
        : `⚠ Partial load (${pageCount} page(s)): ${partialError.message}`
      nftList.appendChild(warn)
    }
  } catch (err) {
    document.getElementById('tof-nft-list').innerHTML =
      `<span class="tof-error">Failed to load NFTs: ${err.message}</span>`
  }
}

export function closeTradeOfferUI() {
  _overlay?.classList.remove('on')
  _theirAddr = null; _selectedNFT = null
}

export function isTradeOfferUIOpen() {
  return !!_overlay?.classList.contains('on')
}

// Render NFT grid
function _renderNFTList(axies) {
  const list = document.getElementById('tof-nft-list')
  if (!axies.length) {
    list.innerHTML = '<span class="tof-empty">No Axies in wallet</span>'
    return
  }
  list.innerHTML = ''
  axies.forEach(nft => {
    const card = document.createElement('div')
    card.className = 'tof-nft-card'
    card.dataset.tokenId = nft.tokenId
    card.innerHTML = `
      <img src="${nft.imageUrl || ''}" alt="#${nft.tokenId}" loading="lazy" />
      <span>#${nft.tokenId}</span>
    `
    card.addEventListener('click', () => {
      document.querySelectorAll('.tof-nft-card').forEach(c => c.classList.remove('sel'))
      card.classList.add('sel')
      _selectedNFT = nft
      _updateSendButton()
    })
    list.appendChild(card)
  })
}

function _updateSendButton() {
  const wantId = document.getElementById('tof-want-id')?.value.trim()
  document.getElementById('tof-send').disabled =
    !_selectedNFT || !wantId || _sending
}

document.addEventListener('input', e => {
  if (e.target.id === 'tof-want-id') _updateSendButton()
})

// Send handler
async function _handleSend() {
  if (_sending) return
  const wantId = document.getElementById('tof-want-id').value.trim()
  if (!_selectedNFT || !wantId) return

  _sending = true
  document.getElementById('tof-send').disabled = true
  const status = document.getElementById('tof-status')
  status.textContent = '⏳ Requesting wallet signature…'

  try {
    const myAddr   = getAddress()
    const provider = getRoninProvider()
    const signer   = await provider.getSigner()

    const wantNFT = {
      contractAddress: AXIE_CONTRACT,
      tokenId:         wantId,
    }

    const endTime = Math.floor(Date.now() / 1000) + 86400

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
      content: `Trade offer: my Axie #${_selectedNFT.tokenId} for your Axie #${wantId}`,
      trade_payload: {
        orderJson:             serialiseOrder(order),
        orderHash,
        offerTokenId:          String(_selectedNFT.tokenId),
        considerationTokenId:  wantId,
        endTime,
      },
    })

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
