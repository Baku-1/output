// ═══════════════════════════════════════════════════════════════
// trade.js — Seaport 1.6 P2P NFT swap on Ronin
// The Outlet — WebZone 001
//
// Seaport 1.6 on Ronin: 0x0000000000000068f116a894984e2db1123eb395
// Chain ID: 2020 (Ronin Mainnet)
//
// Flow:
//   Initiator  → createTradeOrder() → signs off-chain → sends via Ably
//   Recipient  → fulfillTradeOrder() → on-chain tx (pays gas)
//   Either     → cancelTradeOrder() to void a pending offer
// ═══════════════════════════════════════════════════════════════
import { Seaport } from '@opensea/seaport-js'
import { ItemType } from '@opensea/seaport-js/lib/constants.js' // ItemType is not re-exported from the main entry point in v4.x
import { ethers } from 'ethers'
import { getProvider } from './wallet.js'

const SEAPORT_ADDRESS = '0x0000000000000068f116a894984e2db1123eb395'
const RONIN_RPC       = 'https://api.roninchain.com/rpc'
// Open channel — correct for direct P2P trades on Ronin Seaport 1.6.
// Mavis Market operator trades use a non-zero Sky Mavis conduit key; this
// app does not route through that operator.
const RONIN_CONDUIT_KEY = '0x0000000000000000000000000000000000000000000000000000000000000000'

// Singleton seaport instance (signing)
// Lazily created on first use; replaced when provider changes.
let _seaport = null
let _provider = null

function _getSeaport(signerOrProvider) {
  if (signerOrProvider !== _provider) {
    _provider = signerOrProvider
    _seaport  = new Seaport(signerOrProvider, {
      overrides: { contractAddress: SEAPORT_ADDRESS },
    })
  }
  return _seaport
}

// Singleton seaport instance (read-only)
// Used exclusively by getOrderStatus so it never pollutes the signing
// singleton with a JsonRpcProvider reference.
let _readSeaport  = null
let _readProvider = null

function _getReadSeaport() {
  if (!_readSeaport) {
    _readProvider = new ethers.JsonRpcProvider(RONIN_RPC)
    _readSeaport  = new Seaport(_readProvider, { overrides: { contractAddress: SEAPORT_ADDRESS } })
  }
  return _readSeaport
}

// Get ethers provider from tanto-connect
// Delegates provider resolution to wallet.js (handles extension, WalletConnect,
// Waypoint). Always returns a signer-capable BrowserProvider or throws.
export function getRoninProvider() {
  const rawProvider = getProvider()
  if (rawProvider) {
    return new ethers.BrowserProvider(rawProvider)
  }
  throw new Error('No signing provider available — connect a wallet first')
}

// NFT item helper
// Converts a normalised nftService.js NFT object into a Seaport item
export function nftToSeaportItem(nft, recipientAddress) {
  const item = {
    itemType:   ItemType.ERC721,
    token:      nft.contractAddress,
    identifier: String(nft.tokenId),
  }
  if (recipientAddress) item.recipient = recipientAddress
  return item
}

// Create and sign a trade order (off-chain, no gas)
// offerNFTs:  array of normalised NFT objects (what the initiator gives)
// wantNFTs:   array of normalised NFT objects (what the initiator wants)
// offererAddress: initiator's wallet address
// signer: ethers Signer (from BrowserProvider.getSigner())
// Returns: { order, orderHash } ready to send over Ably
export async function createTradeOrder(offerNFTs, wantNFTs, offererAddress, signer, endTime) {
  const seaport = _getSeaport(signer)

  const offer = offerNFTs.map(nft => nftToSeaportItem(nft))

  // Consideration: the NFTs the offerer wants, sent to the offerer's address
  const consideration = wantNFTs.map(nft => nftToSeaportItem(nft, offererAddress))

  // Default 24-hour expiry if not specified
  const orderEndTime = endTime ?? Math.floor(Date.now() / 1000) + 86400

  const { executeAllActions } = await seaport.createOrder(
    { offer, consideration, endTime: String(orderEndTime), conduitKey: RONIN_CONDUIT_KEY },
    offererAddress,
  )

  const order = await executeAllActions()
  const orderHash = seaport.getOrderHash(order.parameters)

  return { order, orderHash }
}

// Fulfill a trade order (on-chain, fulfiller pays gas)
// order: the signed order received from the initiator
// fulfillerAddress: recipient's wallet address
// signer: ethers Signer
// Returns: ethers TransactionResponse
export async function fulfillTradeOrder(order, fulfillerAddress, signer) {
  const seaport = _getSeaport(signer)

  // Defense-in-depth: verify all consideration recipients match the offerer.
  // Consideration items go to the offerer, not the fulfiller. A malicious order
  // could redirect recipients to an attacker; abort before the wallet prompt.
  const offerer = order.parameters.offerer?.toLowerCase()
  if (!offerer) throw new Error('Order missing offerer address')
  const items = order.parameters.consideration
  if (!items?.length) throw new Error('Order has no consideration items')
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.recipient?.toLowerCase() !== offerer) {
      throw new Error(
        'Consideration recipient mismatch: item ' + i + ' recipient ' +
        item.recipient + ' !== offerer ' + offerer
      )
    }
  }

  const { executeAllActions } = await seaport.fulfillOrder({
    order,
    accountAddress: fulfillerAddress,
    conduitKey: RONIN_CONDUIT_KEY,
  })

  return executeAllActions()
}

// Cancel a pending order
// Cancels on-chain so the order can never be fulfilled.
// Only the offerer can cancel.
export async function cancelTradeOrder(order, offererAddress, signer) {
  const seaport = _getSeaport(signer)

  const { transact } = seaport.cancelOrders(
    [order.parameters],
    offererAddress,
  )

  return transact()
}

// Check order status — Returns { isFulfilled, isCancelled }
export async function getOrderStatus(orderHash) {
  const seaport = _getReadSeaport()
  return seaport.getOrderStatus(orderHash)
}

// Serialise / deserialise order for Ably transport
// Seaport orders contain BigInt values — JSON.stringify needs replacer.
// Reviver uses explicit key set so string token IDs are not coerced.
// identifierOrCriteria: NFT token ID in offer/consideration items (BigInt).
const BIGINT_FIELDS = new Set([
  'salt', 'startTime', 'endTime', 'counter',
])

export function serialiseOrder(order) {
  return JSON.stringify(order, (_, v) => typeof v === 'bigint' ? v.toString() : v)
}

export function deserialiseOrder(json) {
  return JSON.parse(json, (key, value) => {
    if (typeof value === 'string' && BIGINT_FIELDS.has(key)) {
      return BigInt(value)
    }
    return value
  })
}