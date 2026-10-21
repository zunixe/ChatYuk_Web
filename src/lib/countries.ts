// 141 negara — PERSIS sama dengan `allCountries` di
// chatyuk/lib/config/regions_countries.dart (dipakai filter Online).
import countries from '@/lib/countries.data.json'

export const ALL_COUNTRIES: string[] = countries

/** Teks field saat >1 negara dipilih (mobile: `selCountriesCount`). */
export function countriesCountText(n: number): string {
  return `${n} negara`
}
