// ═══════════════════════════════════════════════════════════════
// validation.js — shared token-ID validation (Phase 2.1)
// Extracted from the formerly duplicated implementations in
// tradeOfferFlow.js and dmPanel.js (both marked "Fix #8").
//
// Two tiers:
//   TOKEN_ID_PATTERN   — display allow-list (what may be rendered)
//   DECIMAL_ID_PATTERN — order-bound IDs must be decimal uint256
//                        (max 78 digits, spec R4); enforced at the
//                        trade-construction boundary in trade.js.
// ═══════════════════════════════════════════════════════════════

export const TOKEN_ID_PATTERN   = /^[a-zA-Z0-9_-]{1,64}$/
export const DECIMAL_ID_PATTERN = /^\d{1,78}$/

// Returns the string form of `val` if it passes the display allow-list,
// otherwise `fallback` (default null). Callers keep their own display
// behavior by choosing the fallback.
export function safeTokenId(val, fallback = null) {
  const s = String(val ?? '')
  return TOKEN_ID_PATTERN.test(s) ? s : fallback
}

// True if `val` is a valid order-bound decimal uint256 token ID.
export function isDecimalTokenId(val) {
  return DECIMAL_ID_PATTERN.test(String(val ?? ''))
}
