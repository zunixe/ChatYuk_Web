// Data negara → kota dipindah ke regions.data.json agar file ini tetap ringkas.
// Sumber asli: ChatYuk mobile lib/config/regions_data_*.dart
import regionsData from '@/lib/regions.data.json'

export const REGIONS: Record<string, string[]> = regionsData

export const COUNTRIES = Object.keys(REGIONS)

export function getCities(country: string): string[] {
  return REGIONS[country] ?? []
}

export const AGES = Array.from({ length: 87 }, (_, index) => index + 13)
