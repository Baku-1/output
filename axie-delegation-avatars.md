# Axie Delegation → Delegated-NFT Avatars — Research Notes

Goal: let a player whose wallet holds **no** Axies, but who has Axies
**delegated to them**, pick those Axies as their avatar in The Outlet.

---

## 1. What "the Axie Delegations contract" actually is

The GitHub artifact behind Axie Delegation is **REP-0015 — "Ownership
Delegation and Context for ERC-721"**, a Ronin token-standard proposal
authored by Sky Mavis (Duc Tho Tran, 2024). It lives in two repos under the
`ronin-chain` org:

| Repo | Contents |
|---|---|
| [`ronin-chain/REPs`](https://github.com/ronin-chain/REPs) → `REP-0015/REP-0015.md` | The spec (status: Draft) |
| [`ronin-chain/rep-0015`](https://github.com/ronin-chain/rep-0015) | Reference implementation (Foundry, `src/REP15.sol`, releases since Sep 2024) |

There is **no separate "AxieDelegation" contract repo** — REP-0015 is an
*extension interface implemented by the NFT contract itself*. The Axie
contract on Ronin mainnet (`0x32950db2a7164ae833121501c797d79e7b79d74c`,
already in `nftService.js` as `AXIE_CONTRACTS`) was upgraded to expose it
when Axie Delegation launched (Oct 2024). The delegation does **not**
transfer the token: `ownerOf(tokenId)` keeps returning the delegator.

> Don't confuse this with two similarly-named things:
> - `axieinfinity/ronin-dpos-contracts` — **validator staking** delegation (consensus, unrelated).
> - The delegate.xyz registry on Ronin (`docs.skymavis.com/third-party/delegate/…`) — wallet-level
>   delegation for airdrop claims etc. Different system; app.axie gameplay delegation is REP-0015.

## 2. The interface that matters for us

ERC-165 id for REP-0015: **`0xba63ebbb`** (`supportsInterface` check).

Read functions (all **per-token** — this is the crux):

```solidity
function getOwnershipManager(uint256 tokenId) external view returns (address manager);          // 0x10bda4ed
function getOwnershipDelegatee(uint256 tokenId) external view returns (address delegatee, uint64 until); // 0xe1458320  (reverts if none)
```

Events (both `tokenId` and `delegatee` are **indexed** — verified in
`rep-0015/src/interfaces/IREP15.sol`):

```text
OwnershipDelegationStarted(uint256 indexed tokenId, address indexed delegatee, uint64 until)
  topic0 = 0xd53478650f5188c1beb4a4897d233f3c9c636f600630c72266bdb216474fa752
OwnershipDelegationAccepted(uint256 indexed tokenId, address indexed delegatee, uint64 until)
  topic0 = 0x54b44a462e87fa8234e977fa235b3407f1434f69b1d378032ba06a103835bfd9
OwnershipDelegationStopped(uint256 indexed tokenId, address indexed delegatee)
  topic0 = 0x93f65897a88aa3c0b9b5d4db049fe366ce98e99591bc37e151bbd3d6a0814b02
```

Delegation lifecycle: owner calls `startDelegateOwnership(tokenId, delegatee,
until)` (pending) → delegatee calls `acceptOwnershipDelegation(tokenId)`
(active) → expires at `until`, or delegatee stops early. Only **accepted**
delegations should count for avatars.

## 3. Why our current pipeline can't see delegated Axies

`fetchWalletNFTs()` (`src/nftService.js`) enumerates via Moralis
`/{address}/nft?chain=ronin`, which indexes `ownerOf`/`Transfer` — delegated
Axies never appear for the delegatee. **There is no on-chain
"delegations-by-delegatee" enumeration in REP-0015 either**; the standard's
views are per-token. So we need one of:

### Option A — event scan + state check (trustless, no new vendors)

1. `eth_getLogs` on the Axie contract with
   `topics = [ACCEPTED_TOPIC, null, pad32(delegateeAddr)]` from the
   delegation launch block (~Oct 2024) to `latest`. Public Ronin RPC
   (`https://api.roninchain.com/rpc`) caps `eth_getLogs` ranges, so chunk the
   scan — or better, do it in a small serverless fn (`api/delegations.js`)
   with a cached cursor, mirroring the `api/graphql.js` pattern.
2. Dedupe tokenIds, then confirm live state per token with
   `getOwnershipDelegatee(tokenId)`: keep only
   `delegatee == player && until > now` (catches expiry, stop, re-delegation
   to someone else).
3. Batch step 2 via multicall (Multicall3 is deployed on Ronin at the
   canonical `0xcA11bde05977b3631167028862bE2a173976CA11`).

### Option B — Sky Mavis GraphQL (least code, unofficial schema)

app.axie's **Delegation Center** has a literal **"Delegated to Me"** tab
([guide](https://support.axieinfinity.com/hc/en-us/articles/29990965331867-Axie-Delegation-Guide)),
and Homeland already uses delegated Axies for its *Avatar mode*
([announcement](https://x.com/AxieInfinity/status/1848287125961347467)) — so
a delegatee-side query exists on the gateway we already proxy
(`api-gateway.skymavis.com/graphql/axie-marketplace` via `api/graphql.js`).

What we ruled out (checked 2026-07): the schema is not in any public doc —
the community GraphQL docs ([ShaneMaglangit/axie-graphql-documentation](https://github.com/ShaneMaglangit/axie-graphql-documentation))
were archived Apr 2022, pre-delegation; and the **Mavis Market** gateway
(`marketplace-graphql.skymavis.com`, per [skymavis/ronin-market-sdk](https://github.com/skymavis/ronin-market-sdk))
has **no** delegation fields at all — its `Erc721` type carries only
`owner`/`isLocked`. Delegation is app.axie-gateway-only.

Exact query names need one introspection round-trip with a real API key,
which this sandbox's network policy blocks. That's automated in
**`scripts/probe-delegation-graphql.mjs`**:

```bash
SKY_MAVIS_API_KEY=xxx node scripts/probe-delegation-graphql.mjs
# or against a deployment (key attached server-side by api/graphql.js):
node scripts/probe-delegation-graphql.mjs --url https://<deployment>/api/graphql
```

It introspects Query fields and types matching `/delegat/i` (printing full
arg/return signatures), dumps the `axies(...)` filter args in case
delegation is a filter flag rather than a top-level query, and — if
introspection is disabled — falls back to probing candidate field names,
using "Cannot query field" errors to prove absence.

**Recommendation:** run the probe first; if a delegatee query exists, B is
one GraphQL call and no log scanning. Keep A as the trustless
fallback/verifier either way.

## 4. Integration sketch (once enumeration works)

- `nftService.js`: add `fetchDelegatedAxies(address)` returning the same
  normalised NFT shape as `fetchWalletNFTs`, tagged `delegated: true` and
  carrying `until` (expiry).
- `avatarPicker.js`: merge delegated Axies into the grid with a "Delegated"
  badge; everything downstream is unchanged — the Spine path
  (genes → `@axieinfinity/mixer`) fetches by tokenId and doesn't care about
  ownership.
- Expiry: delegation `until` is a hard timestamp. Cheap policy: re-validate
  `getOwnershipDelegatee` when the avatar is (re)selected and on session
  start; if expired, fall back to the default avatar. (Owner-side revocation
  is possible 24 h after delegation, so a mid-session check on reconnect is
  enough — no need to poll.)
- Trading must **exclude** delegated Axies (`tradeOfferFlow.js` picker):
  delegatees can't transfer them, and a Seaport order on a delegated Axie
  would fail at fulfillment anyway — filter `delegated: true` out of the
  offer picker.

## 5. Open items (couldn't verify from this sandbox — network egress blocked)

1. `supportsInterface(0xba63ebbb)` on `0x32950db2…d74c` via Ronin RPC — one
   `eth_call` confirms the deployed Axie contract matches the draft spec
   (the deployed version may deviate from the Draft-status REP).
2. GraphQL introspection for a delegations query (Option B) — run
   `scripts/probe-delegation-graphql.mjs` with the real API key.
3. Ronin public-RPC `eth_getLogs` block-range limit (affects Option A chunk
   size).
4. Whether other Ronin collections we care about (Wild Forest, etc.) also
   implement REP-0015 — the standard is collection-agnostic, so
   `fetchDelegatedAxies` should really be `fetchDelegatedNFTs(contract,
   address)` keyed off the same topic hashes.

References: [REP-0015 spec](https://github.com/ronin-chain/REPs/blob/main/REP-0015/REP-0015.md) ·
[reference impl](https://github.com/ronin-chain/rep-0015) ·
[Axie Delegation guide](https://support.axieinfinity.com/hc/en-us/articles/29990965331867-Axie-Delegation-Guide) ·
[Axie Delegation features](https://blog.axieinfinity.com/p/axie-delegation-new-features-available)
