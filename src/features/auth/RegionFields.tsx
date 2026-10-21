import { Label } from '@/components/ui/input'
import { SearchSelect } from '@/components/ui/search-select'
import { AGES, COUNTRIES, getCities } from '@/lib/regions'

function withCurrent(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options
  return [current, ...options]
}

/**
 * Umur, Negara, dan Kota — semuanya memakai dropdown BER-PENCARIAN,
 * sama seperti `profile_form_card.dart` di Android (`SearchDropdown`):
 * - Umur: tanpa field cari (hanya 18–60, sedikit)
 * - Negara: cari "Cari negara..."
 * - Kota: cari "Cari kota..."
 */
export function RegionFields({
  age,
  country,
  city,
  onAgeChange,
  onCountryChange,
  onCityChange,
  disabled,
}: {
  age: string
  country: string
  city: string
  onAgeChange: (value: string) => void
  onCountryChange: (value: string) => void
  onCityChange: (value: string) => void
  disabled?: boolean
}) {
  const cities = withCurrent(getCities(country), city)
  const ageOptions = AGES.map((value) => String(value))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <div>
          <Label htmlFor="region-age" className="sr-only">
            Umur
          </Label>
          <SearchSelect
            id="region-age"
            label="Umur"
            value={age}
            options={ageOptions}
            onChange={onAgeChange}
            searchPlaceholder="Cari umur..."
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="region-country" className="sr-only">
            Negara
          </Label>
          <SearchSelect
            id="region-country"
            label="Negara"
            value={country}
            options={withCurrent(COUNTRIES, country)}
            onChange={onCountryChange}
            searchPlaceholder="Cari negara..."
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="region-city" className="sr-only">
          Kota
        </Label>
        <SearchSelect
          id="region-city"
          label="Kota"
          value={city}
          options={cities}
          onChange={onCityChange}
          searchPlaceholder="Cari kota..."
          emptyText={cities.length === 0 ? 'Pilih negara dulu' : 'Tidak ditemukan'}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
