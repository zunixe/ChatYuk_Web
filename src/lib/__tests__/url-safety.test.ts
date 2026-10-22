import { describe, expect, it } from 'vitest'
import { safeMapUrl, safeMediaUrl, safePhoneHref, safePhoneLabel } from '@/lib/url-safety'

describe('safeMediaUrl', () => {
  it('allows https, blob and inline image/audio data URLs', () => {
    expect(safeMediaUrl('https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg')
    expect(safeMediaUrl('blob:https://x.test/abc')).toContain('blob:')
    expect(safeMediaUrl('data:image/jpeg;base64,AAA')).toBe('data:image/jpeg;base64,AAA')
    expect(safeMediaUrl('data:audio/mp4;base64,AAA')).toBe('data:audio/mp4;base64,AAA')
  })

  it('rejects javascript:, file:, data:text/html and empty values', () => {
    expect(safeMediaUrl('javascript:alert(1)')).toBeNull()
    expect(safeMediaUrl('JavaScript:alert(1)')).toBeNull()
    expect(safeMediaUrl('file:///etc/passwd')).toBeNull()
    expect(safeMediaUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeMediaUrl('data:text/javascript,alert(1)')).toBeNull()
    expect(safeMediaUrl('')).toBeNull()
    expect(safeMediaUrl(null)).toBeNull()
  })
})

describe('safePhoneHref', () => {
  it('accepts plausible phone numbers (with +, spaces, dashes)', () => {
    expect(safePhoneHref('+6281234567890')).toBe('tel:+6281234567890')
    expect(safePhoneHref('0812-3456-789')).toBe('tel:08123456789')
    expect(safePhoneHref('(021) 555 1234')).toBe('tel:0215551234')
  })

  it('rejects injection attempts and junk', () => {
    expect(safePhoneHref('javascript:alert(1)')).toBeNull()
    expect(safePhoneHref('12')).toBeNull()
    expect(safePhoneHref('1234567890123456789')).toBeNull()
    expect(safePhoneHref('+62abc')).toBeNull()
    expect(safePhoneHref(null)).toBeNull()
  })

  it('label keeps original formatting only when valid', () => {
    expect(safePhoneLabel('+62 812-3456-7890')).toBe('+62 812-3456-7890')
    expect(safePhoneLabel('javascript:alert(1)')).toBeNull()
  })
})

describe('safeMapUrl', () => {
  it('builds a maps link for valid coordinates', () => {
    expect(safeMapUrl(-6.2, 106.8)).toBe('https://maps.google.com/?q=-6.2,106.8')
    expect(safeMapUrl('0', '0')).toBe('https://maps.google.com/?q=0,0')
    expect(safeMapUrl(-90, 180)).toBe('https://maps.google.com/?q=-90,180')
  })

  it('rejects non-numeric and out-of-range coordinates', () => {
    expect(safeMapUrl('abc', 10)).toBeNull()
    expect(safeMapUrl(0, 0)).toBe('https://maps.google.com/?q=0,0')
    expect(safeMapUrl(91, 10)).toBeNull()
    expect(safeMapUrl(10, 181)).toBeNull()
    expect(safeMapUrl(null, null)).toBeNull()
    expect(safeMapUrl(undefined, undefined)).toBeNull()
  })
})
