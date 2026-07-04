import { describe, it, expect } from 'vitest'
import { TOKEN_ID_PATTERN, DECIMAL_ID_PATTERN, safeTokenId, isDecimalTokenId } from './validation.js'

describe('safeTokenId (display allow-list)', () => {
  it('accepts plain decimal IDs', () => {
    expect(safeTokenId('12345')).toBe('12345')
  })

  it('accepts alphanumeric with _ and -', () => {
    expect(safeTokenId('abc_DEF-123')).toBe('abc_DEF-123')
  })

  it('stringifies numeric input', () => {
    expect(safeTokenId(42)).toBe('42')
  })

  it('rejects XSS/injection characters → default null', () => {
    expect(safeTokenId('<script>alert(1)</script>')).toBeNull()
    expect(safeTokenId('1"; DROP TABLE--')).toBeNull()
    expect(safeTokenId('a b c')).toBeNull()
  })

  it('rejects oversized IDs (>64 chars)', () => {
    expect(safeTokenId('a'.repeat(65))).toBeNull()
    expect(safeTokenId('a'.repeat(64))).toBe('a'.repeat(64))
  })

  it('rejects empty / null / undefined → fallback', () => {
    expect(safeTokenId('')).toBeNull()
    expect(safeTokenId(null)).toBeNull()
    expect(safeTokenId(undefined)).toBeNull()
  })

  it('honours a custom fallback', () => {
    expect(safeTokenId('<x>', '[invalid token]')).toBe('[invalid token]')
    expect(safeTokenId('', '?')).toBe('?')
  })
})

describe('isDecimalTokenId (order-bound uint256)', () => {
  it('accepts decimal strings and numbers', () => {
    expect(isDecimalTokenId('0')).toBe(true)
    expect(isDecimalTokenId('99999')).toBe(true)
    expect(isDecimalTokenId(42)).toBe(true)
  })

  it('accepts up to 78 digits (uint256 max length), rejects 79', () => {
    expect(isDecimalTokenId('9'.repeat(78))).toBe(true)
    expect(isDecimalTokenId('9'.repeat(79))).toBe(false)
  })

  it('rejects hex, alpha, signs, decimals, whitespace', () => {
    expect(isDecimalTokenId('0x1f')).toBe(false)
    expect(isDecimalTokenId('12a')).toBe(false)
    expect(isDecimalTokenId('-5')).toBe(false)
    expect(isDecimalTokenId('1.5')).toBe(false)
    expect(isDecimalTokenId(' 1')).toBe(false)
    expect(isDecimalTokenId('')).toBe(false)
    expect(isDecimalTokenId(null)).toBe(false)
  })

  it('display-valid IDs are NOT automatically order-valid (bypass gap closed)', () => {
    // These pass the display allow-list but must never reach an order
    expect(TOKEN_ID_PATTERN.test('abc_DEF-123')).toBe(true)
    expect(DECIMAL_ID_PATTERN.test('abc_DEF-123')).toBe(false)
  })
})
