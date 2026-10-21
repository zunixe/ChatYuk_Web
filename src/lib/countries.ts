// 141 negara — PERSIS sama dengan `allCountries` di
// chatyuk/lib/config/regions_countries.dart (dipakai filter Online).
import countries from '@/lib/countries.data.json'

export const ALL_COUNTRIES: string[] = countries

/**
 * Teks field saat >1 negara dipilih (mobile: `selCountriesCount`).
 * i18n: EN "n countries", ID "n negara".
 */
export function countriesCountText(n: number, lang: string = 'en'): string {
  return lang === 'id' ? `${n} negara` : `${n} countries`
}
