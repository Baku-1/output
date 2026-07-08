// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@opensea/seaport-js', () => ({
  Seaport: vi.fn(),
}))
vi.mock('@opensea/seaport-js/lib/constants.js', () => ({
  ItemType: { ERC721: 2 },
}))
vi.mock('./wallet.js', () => ({
  getProvider: vi.fn(() => null),
}))
// vi.hoisted lets us share refs between the factory and test body
const { mockBrowserProvider } = vi.hoisted(() => ({
  mockBrowserProvider: vi.fn(),
}))

vi.mock('ethers', () => ({
  // trade.js uses `import { ethers } from 'ethers'` then `new ethers.BrowserProvider(...)`
  ethers: {
    BrowserProvider:  mockBrowserProvider,
    JsonRpcProvider:  vi.fn(),
  },
}))

import { Seaport } from '@opensea/seaport-js'
import {
  nftToSeaportItem,
  serialiseOrder,
  deserialiseOrder,
  fulfillTradeOrder,
  createTradeOrder,
  cancelTradeOrder,
  getRoninProvider,
} from './trade.js'
import { getProvider } from './wallet.js'

// Helper: unique signer object so _getSeaport always creates a fresh instance
let _signerCounter = 0
const makeSigner = () => ({ _id: ++_signerCounter })

// ─── nftToSeaportItem ──────────────────────────────────────────────────────

describe('nftToSeaportItem', () => {
  it('returns correct Seaport item shape for an ERC-721 NFT', () => {
    const nft = { contractAddress: '0xabc123', tokenId: 42 }
    const item = nftToSeaportItem(nft)
    expect(item.itemType).toBe(2) // ItemType.ERC721
    expect(item.token).toBe('0xabc123')
    expect(item.identifier).toBe('42')
    expect('recipient' in item).toBe(false)
  })

  it('converts numeric tokenId to string', () => {
    const item = nftToSeaportItem({ contractAddress: '0x1', tokenId: 99999 })
    expect(item.identifier).toBe('99999')
  })

  it('includes recipient address when provided', () => {
    const nft = { contractAddress: '0x1', tokenId: 1 }
    const item = nftToSeaportItem(nft, '0xRecipient')
    expect(item.recipient).toBe('0xRecipient')
  })

  it('omits recipient when not provided', () => {
    const item = nftToSeaportItem({ contractAddress: '0x1', tokenId: 1 })
    expect(item.recipient).toBeUndefined()
  })

  // Phase 2.1: decimal-uint256 enforcement at the construction boundary —
  // a caller that skips the tradeOfferFlow UI check can no longer build
  // an order around a crafted ID.
  it('throws on non-decimal token IDs (boundary enforcement)', () => {
    expect(() => nftToSeaportItem({ contractAddress: '0x1', tokenId: '0x1f' })).toThrow(/Invalid token ID/)
    expect(() => nftToSeaportItem({ contractAddress: '0x1', tokenId: '<script>' })).toThrow(/Invalid token ID/)
    expect(() => nftToSeaportItem({ contractAddress: '0x1', tokenId: '9'.repeat(79) })).toThrow(/Invalid token ID/)
    expect(() => nftToSeaportItem({ contractAddress: '0x1', tokenId: null })).toThrow(/Invalid token ID/)
  })
})

// ─── serialiseOrder / deserialiseOrder ─────────────────────────────────────

describe('serialiseOrder / deserialiseOrder', () => {
  const buildOrder = (overrides = {}) => ({
    parameters: {
      offerer: '0xofferer',
      offer: [],
      consideration: [],
      salt: BigInt('98765432101234567890'),
      startTime: BigInt(0),
      endTime: BigInt(1735689600),
      counter: BigInt(0),
      ...overrides,
    },
    signature: '0xsig',
  })

  it('serialises BigInt fields without throwing', () => {
    const json = serialiseOrder(buildOrder())
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('round-trips all BIGINT_FIELDS back to BigInt', () => {
    const order = buildOrder()
    const restored = deserialiseOrder(serialiseOrder(order))
    expect(restored.parameters.salt).toBe(BigInt('98765432101234567890'))
    expect(restored.parameters.startTime).toBe(BigInt(0))
    expect(restored.parameters.endTime).toBe(BigInt(1735689600))
    expect(restored.parameters.counter).toBe(BigInt(0))
  })

  it('preserves non-BigInt string fields as strings', () => {
    const restored = deserialiseOrder(serialiseOrder(buildOrder()))
    expect(restored.parameters.offerer).toBe('0xofferer')
    expect(restored.signature).toBe('0xsig')
  })

  it('does NOT coerce non-BIGINT_FIELDS numeric strings to BigInt', () => {
    const order = { parameters: { identifier: '12345' } }
    const restored = deserialiseOrder(serialiseOrder(order))
    expect(typeof restored.parameters.identifier).toBe('string')
    expect(restored.parameters.identifier).toBe('12345')
  })

  it('handles an order with no BigInt fields', () => {
    const order = { type: 'FULL_OPEN', version: 1 }
    const restored = deserialiseOrder(serialiseOrder(order))
    expect(restored.type).toBe('FULL_OPEN')
    expect(restored.version).toBe(1)
  })
})

// ─── fulfillTradeOrder – security validation ───────────────────────────────

describe('fulfillTradeOrder – security validation', () => {
  let mockSeaport

  beforeEach(() => {
    const executeAllActions = vi.fn().mockResolvedValue({ hash: '0xtx' })
    mockSeaport = {
      fulfillOrder: vi.fn().mockResolvedValue({ executeAllActions }),
    }
    // Must use regular function — arrow functions cannot be used as constructors
    Seaport.mockImplementation(function () { return mockSeaport })
  })

  const buildOrder = (offerer, recipients) => ({
    parameters: {
      offerer,
      consideration: recipients.map(r => ({ recipient: r })),
    },
  })

  it('throws "Order missing offerer address" when offerer is absent', async () => {
    const order = { parameters: { consideration: [{ recipient: '0xabc' }] } }
    await expect(fulfillTradeOrder(order, '0xfulfiller', makeSigner()))
      .rejects.toThrow('Order missing offerer address')
  })

  it('throws "Order missing offerer address" when offerer is empty string', async () => {
    const order = buildOrder('', ['0xabc'])
    await expect(fulfillTradeOrder(order, '0xfulfiller', makeSigner()))
      .rejects.toThrow('Order missing offerer address')
  })

  it('throws "Order has no consideration items" when consideration is empty', async () => {
    const order = buildOrder('0xofferer', [])
    await expect(fulfillTradeOrder(order, '0xfulfiller', makeSigner()))
      .rejects.toThrow('Order has no consideration items')
  })

  it('throws "Consideration recipient mismatch" when a recipient differs from offerer', async () => {
    const order = buildOrder('0xofferer', ['0xattacker'])
    await expect(fulfillTradeOrder(order, '0xfulfiller', makeSigner()))
      .rejects.toThrow('Consideration recipient mismatch')
  })

  it('throws on mismatch even when first item matches but second does not', async () => {
    const order = buildOrder('0xofferer', ['0xofferer', '0xattacker'])
    await expect(fulfillTradeOrder(order, '0xfulfiller', makeSigner()))
      .rejects.toThrow('Consideration recipient mismatch')
  })

  it('accepts mixed-case offerer and recipient (case-insensitive match)', async () => {
    const order = buildOrder('0xOffErEr', ['0xOFFERER'])
    await fulfillTradeOrder(order, '0xfulfiller', makeSigner())
    expect(mockSeaport.fulfillOrder).toHaveBeenCalledOnce()
  })

  it('calls fulfillOrder and executeAllActions when all recipients match offerer', async () => {
    const executeAllActions = vi.fn().mockResolvedValue({ hash: '0xok' })
    mockSeaport.fulfillOrder.mockResolvedValue({ executeAllActions })

    const order = buildOrder('0xofferer', ['0xofferer', '0xOfferer'])
    const result = await fulfillTradeOrder(order, '0xfulfiller', makeSigner())

    expect(mockSeaport.fulfillOrder).toHaveBeenCalledOnce()
    expect(executeAllActions).toHaveBeenCalledOnce()
    expect(result).toEqual({ hash: '0xok' })
  })

  it('passes the correct conduit key (zero conduit = open channel)', async () => {
    const order = buildOrder('0xofferer', ['0xofferer'])
    await fulfillTradeOrder(order, '0xfulfiller', makeSigner())
    const callArgs = mockSeaport.fulfillOrder.mock.calls[0][0]
    expect(callArgs.conduitKey).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )
    expect(callArgs.accountAddress).toBe('0xfulfiller')
  })
})

// ─── createTradeOrder ──────────────────────────────────────────────────────

describe('createTradeOrder', () => {
  let mockSeaport

  beforeEach(() => {
    const order = {
      parameters: { offerer: '0xofferer', offer: [], consideration: [] },
      signature: '0xsig',
    }
    const executeAllActions = vi.fn().mockResolvedValue(order)
    mockSeaport = {
      createOrder:  vi.fn().mockResolvedValue({ executeAllActions }),
      getOrderHash: vi.fn().mockReturnValue('0xhash'),
    }
    Seaport.mockImplementation(function () { return mockSeaport })
  })

  it('returns { order, orderHash } from seaport', async () => {
    const offerNFTs = [{ contractAddress: '0xnft', tokenId: '1' }]
    const wantNFTs  = [{ contractAddress: '0xnft', tokenId: '2' }]
    const result = await createTradeOrder(offerNFTs, wantNFTs, '0xofferer', makeSigner(), 9999999999)
    expect(result.orderHash).toBe('0xhash')
    expect(result.order.signature).toBe('0xsig')
  })

  it('uses the provided endTime in the order', async () => {
    const endTime = 1999999999
    await createTradeOrder([], [], '0xofferer', makeSigner(), endTime)
    const callArgs = mockSeaport.createOrder.mock.calls[0][0]
    expect(callArgs.endTime).toBe(String(endTime))
  })

  it('defaults to TRADE_EXPIRY_SEC (1 h) expiry when endTime is omitted', async () => {
    const before = Math.floor(Date.now() / 1000)
    await createTradeOrder([], [], '0xofferer', makeSigner())
    const after = Math.floor(Date.now() / 1000)
    const callArgs = mockSeaport.createOrder.mock.calls[0][0]
    const endTime = Number(callArgs.endTime)
    expect(endTime).toBeGreaterThanOrEqual(before + 3600)
    expect(endTime).toBeLessThanOrEqual(after + 3600)
  })
})

// ─── cancelTradeOrder ──────────────────────────────────────────────────────

describe('cancelTradeOrder', () => {
  it('calls seaport.cancelOrders with the order parameters', async () => {
    const transact = vi.fn().mockResolvedValue({ hash: '0xcancel' })
    const mockSeaport = {
      cancelOrders: vi.fn().mockReturnValue({ transact }),
    }
    Seaport.mockImplementation(function () { return mockSeaport })

    const order = { parameters: { offerer: '0xofferer' } }
    const result = await cancelTradeOrder(order, '0xofferer', makeSigner())

    expect(mockSeaport.cancelOrders).toHaveBeenCalledWith(
      [order.parameters],
      '0xofferer',
    )
    expect(result).toEqual({ hash: '0xcancel' })
  })
})

// ─── getRoninProvider ──────────────────────────────────────────────────────

describe('getRoninProvider', () => {
  it('throws when no provider is connected', () => {
    getProvider.mockReturnValue(null)
    expect(() => getRoninProvider()).toThrow('No signing provider available')
  })

  it('returns a BrowserProvider wrapping the raw provider', () => {
    const rawProvider = { request: vi.fn() }
    getProvider.mockReturnValue(rawProvider)
    mockBrowserProvider.mockImplementation(function (p) { return { _raw: p } })
    const result = getRoninProvider()
    expect(result._raw).toBe(rawProvider)
  })
})
