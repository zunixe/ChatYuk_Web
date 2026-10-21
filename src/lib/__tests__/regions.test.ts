import { describe, expect, it } from 'vitest'
import { AGES, COUNTRIES, REGIONS, getCities } from '@/lib/regions'

// Mirrors mobile lib/config/regions.dart contract used by entry + onboarding.
describe('regions', () => {
  it('ships the same curated country list as mobile', () => {
    expect(COUNTRIES).toHaveLength(141)
    expect(COUNTRIES).toContain('Indonesia')
    expect(COUNTRIES).toContain('Malaysia')
  })

  it('every country has at least one city', () => {
    for (const country of COUNTRIES) {
      expect(REGIONS[country].length, country).toBeGreaterThan(0)
    }
  })

  it('Indonesia exposes the curated city list', () => {
    const cities = getCities('Indonesia')
    expect(cities).toHaveLength(97)
    expect(cities).toContain('Jakarta')
    expect(cities).toContain('Bandung')
    expect(cities).toContain('Surabaya')
  })

  it('returns an empty list for unknown countries', () => {
    expect(getCities('Atlantis')).toEqual([])
    expect(getCities('')).toEqual([])
  })

  it('age options match mobile (13-99)', () => {
    expect(AGES).toHaveLength(87)
    expect(AGES[0]).toBe(13)
    expect(AGES[AGES.length - 1]).toBe(99)
  })
})
