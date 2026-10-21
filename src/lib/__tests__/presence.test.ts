import { describe, expect, it } from 'vitest'
import { STALE_AFTER_MS, effectiveStatus, isEffectivelyOnline } from '@/lib/presence'

const NOW = new Date('2026-10-21T12:00:00.000Z').getTime()
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()

describe('effectiveStatus (mirrors mobile effectiveStatusOf)', () => {
  it('treats invisible as offline for other people', () => {
    expect(effectiveStatus('invisible', minutesAgo(1), NOW)).toBe('offline')
    expect(isEffectivelyOnline('invisible', minutesAgo(1))).toBe(false)
  })

  it('keeps online/idle fresh', () => {
    expect(effectiveStatus('online', minutesAgo(2), NOW)).toBe('online')
    expect(effectiveStatus('idle', minutesAgo(2), NOW)).toBe('idle')
  })

  it('marks stale heartbeats offline after 30 minutes', () => {
    expect(STALE_AFTER_MS).toBe(30 * 60 * 1000)
    expect(effectiveStatus('online', minutesAgo(29), NOW)).toBe('online')
    expect(effectiveStatus('online', minutesAgo(31), NOW)).toBe('offline')
  })

  it('handles missing or unknown values', () => {
    expect(effectiveStatus(null, null, NOW)).toBe('offline')
    expect(effectiveStatus('weird', minutesAgo(1), NOW)).toBe('offline')
    expect(effectiveStatus('online', null, NOW)).toBe('online')
  })
})
