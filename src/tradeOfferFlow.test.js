// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./trade.js', () => ({
  createTradeOrder: vi.fn(),
  serialiseOrder:   vi.fn(o => JSON.stringify(o)),
  getRoninProvider: vi.fn(),
}))
vi.mock('./dmService.js', () => ({
  sendMessage:  vi.fn().mockResolvedValue(undefined),
  sendToInbox:  vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./nftService.js', () => ({
  fetchWalletNFTs: vi.fn(),
}))
vi.mock('./wallet.js', () => ({
  getAddress:    vi.fn(() => '0xmyaddr'),
  shortAddress:  vi.fn(addr => addr.slice(0, 6) + '…'),
}))

import { fetchWalletNFTs } from './nftService.js'
import {
  openTradeOfferUI,
  closeTradeOfferUI,
  isTradeOfferUIOpen,
} from './tradeOfferFlow.js'

const AXIE_CONTRACT = '0x32950db2a7164ae833121501c797d79e7b79d74c'

const makeNFT = (tokenId, imageUrl = `https://img.example.com/${tokenId}.png`) => ({
  contractAddress: AXIE_CONTRACT,
  tokenId,
  imageUrl,
})

const emptyPage = () => Promise.resolve({ nfts: [], nextCursor: null })
const singlePage = nfts => Promise.resolve({ nfts, nextCursor: null })

// ─── isTradeOfferUIOpen / closeTradeOfferUI ────────────────────────────────

describe('isTradeOfferUIOpen', () => {
  beforeEach(() => {
    fetchWalletNFTs.mockImplementation(() => emptyPage())
  })

  afterEach(() => {
    closeTradeOfferUI()
  })

  it('returns false before any open call', () => {
    expect(isTradeOfferUIOpen()).toBe(false)
  })

  it('returns true after openTradeOfferUI', async () => {
    await openTradeOfferUI('0xpeer')
    expect(isTradeOfferUIOpen()).toBe(true)
  })

  it('returns false after closeTradeOfferUI', async () => {
    await openTradeOfferUI('0xpeer')
    closeTradeOfferUI()
    expect(isTradeOfferUIOpen()).toBe(false)
  })
})

// ─── NFT grid rendering – token ID sanitisation ───────────────────────────

describe('NFT grid – token ID sanitisation', () => {
  afterEach(() => closeTradeOfferUI())

  it('renders cards for valid alphanumeric token IDs', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('12345')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const cards = document.querySelectorAll('#tof-my-list .tof-nft-card')
    expect(cards.length).toBe(1)
    expect(cards[0].dataset.tokenId).toBe('12345')
  })

  it('skips NFTs whose token ID contains XSS/injection characters', async () => {
    const maliciousNFT = makeNFT('<script>alert(1)</script>')
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([maliciousNFT]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const cards = document.querySelectorAll('#tof-my-list .tof-nft-card')
    expect(cards.length).toBe(0)
    const empty = document.querySelector('#tof-my-list .tof-empty')
    expect(empty).not.toBeNull()
  })

  it('skips NFTs with token IDs that have spaces', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('1 2 3')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    expect(document.querySelectorAll('#tof-my-list .tof-nft-card').length).toBe(0)
  })

  it('renders multiple valid NFTs', async () => {
    const nfts = [makeNFT('111'), makeNFT('222'), makeNFT('333')]
    fetchWalletNFTs.mockResolvedValueOnce(singlePage(nfts))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    expect(document.querySelectorAll('#tof-my-list .tof-nft-card').length).toBe(3)
  })

  it('shows empty message when no Axies are in the wallet', async () => {
    fetchWalletNFTs.mockResolvedValue(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const empty = document.querySelector('#tof-my-list .tof-empty')
    expect(empty).not.toBeNull()
    expect(empty.textContent).toContain('No Axies')
  })
})

// ─── NFT grid rendering – image URL sanitisation ──────────────────────────

describe('NFT grid – image URL sanitisation', () => {
  afterEach(() => closeTradeOfferUI())

  it('renders an <img> for a valid https image URL', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('1', 'https://cdn.example.com/1.png')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const img = document.querySelector('#tof-my-list .tof-nft-card img')
    expect(img).not.toBeNull()
    expect(img.src).toContain('cdn.example.com')
  })

  it('renders an <img> for a valid http image URL', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('2', 'http://cdn.example.com/2.png')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const img = document.querySelector('#tof-my-list .tof-nft-card img')
    expect(img).not.toBeNull()
  })

  it('suppresses <img> for a javascript: URL', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('3', 'javascript:alert(1)')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    // Card should still be rendered (token ID is valid), but no img element
    const card = document.querySelector('#tof-my-list .tof-nft-card')
    expect(card).not.toBeNull()
    expect(card.querySelector('img')).toBeNull()
  })

  it('suppresses <img> for a data: URL', async () => {
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([makeNFT('4', 'data:text/html,<h1>xss</h1>')]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const card = document.querySelector('#tof-my-list .tof-nft-card')
    expect(card).not.toBeNull()
    expect(card.querySelector('img')).toBeNull()
  })

  it('suppresses <img> when imageUrl is missing', async () => {
    const nft = { contractAddress: AXIE_CONTRACT, tokenId: '5', imageUrl: undefined }
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([nft]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const card = document.querySelector('#tof-my-list .tof-nft-card')
    expect(card).not.toBeNull()
    expect(card.querySelector('img')).toBeNull()
  })
})

// ─── openTradeOfferUI – state reset ───────────────────────────────────────

describe('openTradeOfferUI – state reset between sessions', () => {
  afterEach(() => closeTradeOfferUI())

  it('resets the title to reflect the new peer on each open', async () => {
    fetchWalletNFTs.mockResolvedValue(singlePage([]))
    await openTradeOfferUI('0xAAAAAAAA')
    const title1 = document.getElementById('tof-title').textContent
    closeTradeOfferUI()
    await openTradeOfferUI('0xBBBBBBBB')
    const title2 = document.getElementById('tof-title').textContent
    expect(title1).not.toBe(title2)
    expect(title1).toContain('0xAAAA')
    expect(title2).toContain('0xBBBB')
  })

  it('disables the send button on open', async () => {
    fetchWalletNFTs.mockResolvedValue(singlePage([]))
    await openTradeOfferUI('0xpeer')
    expect(document.getElementById('tof-send').disabled).toBe(true)
  })

  it('filters out non-Axie NFTs from the grid', async () => {
    const nonAxie = { contractAddress: '0xother', tokenId: '1', imageUrl: 'https://x.com/1.png' }
    const axie    = makeNFT('2')
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([nonAxie, axie]))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    expect(document.querySelectorAll('#tof-my-list .tof-nft-card').length).toBe(1)
  })
})

// ─── fetchWalletNFTs error handling ───────────────────────────────────────

describe('openTradeOfferUI – fetch error handling', () => {
  afterEach(() => closeTradeOfferUI())

  it('shows an error message when the initial NFT fetch fails', async () => {
    fetchWalletNFTs.mockRejectedValueOnce(new Error('network timeout'))
    fetchWalletNFTs.mockResolvedValueOnce(singlePage([]))
    await openTradeOfferUI('0xpeer')
    const err = document.querySelector('#tof-my-list .tof-error')
    expect(err).not.toBeNull()
    expect(err.textContent).toContain('network timeout')
  })
})
