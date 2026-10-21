import { describe, expect, it } from 'vitest'
import { ALL_COUNTRIES, countriesCountText } from '@/lib/countries'

// Referensi: chatyuk/lib/config/regions_countries.dart (allCountries)
describe('ALL_COUNTRIES (filter Online)', () => {
  it('memuat 141 negara seperti aplikasi Android', () => {
    expect(ALL_COUNTRIES).toHaveLength(141)
  })

  it('berisi negara kunci dan tetap alfabetis', () => {
    expect(ALL_COUNTRIES).toContain('Indonesia')
    expect(ALL_COUNTRIES).toContain('Malaysia')
    expect(ALL_COUNTRIES).toContain('Timor-Leste')
    expect(ALL_COUNTRIES[0]).toBe('Afghanistan')
    expect(ALL_COUNTRIES[ALL_COUNTRIES.length - 1]).toBe('Zimbabwe')
    const sorted = [...ALL_COUNTRIES].sort((a, b) => a.localeCompare(b, 'en'))
    expect(ALL_COUNTRIES).toEqual(sorted)
  })

  it('tidak ada duplikat', () => {
    expect(new Set(ALL_COUNTRIES).size).toBe(ALL_COUNTRIES.length)
  })

  it('teks field saat >1 negara sama seperti mobile("N negara")', () => {
    expect(countriesCountText(2)).toBe('2 negara')
    expect(countriesCountText(7)).toBe('7 negara')
  })
})

// Logika filter klien — urutan sama dengan online_users_screen.dart
describe('logika filter Online', () => {
  const users = [
    { id: 'a', nickname: 'Anto', country: 'Indonesia', gender: 'male' },
    { id: 'b', nickname: 'Sari', country: 'Indonesia', gender: 'female' },
    { id: 'c', nickname: 'John', country: 'United States', gender: 'male' },
  ]

  function apply(
    list: typeof users,
    { countries, gender }: { countries: string[]; gender: 'all' | 'male' | 'female' },
  ) {
    return list.filter((user) => {
      if (countries.length > 0 && !countries.includes(user.country)) return false
      if (gender !== 'all' && user.gender !== gender) return false
      return true
    })
  }

  it('negara kosong = semua negara', () => {
    expect(apply(users, { countries: [], gender: 'all' })).toHaveLength(3)
  })

  it('negara multi-select mencocokkan salah satu', () => {
    const result = apply(users, { countries: ['Indonesia', 'United States'], gender: 'all' })
    expect(result.map((u) => u.id)).toEqual(['a', 'b', 'c'])
  })

  it('negara + gender digabung (AND)', () => {
    const result = apply(users, { countries: ['Indonesia'], gender: 'female' })
    expect(result.map((u) => u.id)).toEqual(['b'])
  })

  it('gender saja menyaring lintas negara', () => {
    const result = apply(users, { countries: [], gender: 'male' })
    expect(result.map((u) => u.id)).toEqual(['a', 'c'])
  })
})
