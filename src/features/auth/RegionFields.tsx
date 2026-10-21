import { ChevronDown } from 'lucide-react'
import { Label } from '@/components/ui/input'
import { AGES, COUNTRIES, getCities } from '@/lib/regions'

const SELECT_CLASS =
  'h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-9 text-[13.5px] text-text outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-60'

function withCurrent(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options
  return [current, ...options]
}

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <div>
          <Label htmlFor="region-age">Umur</Label>
          <div className="relative">
            <select
              id="region-age"
              value={age}
              onChange={(event) => onAgeChange(event.target.value)}
              disabled={disabled}
              className={SELECT_CLASS}
            >
              {AGES.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          </div>
        </div>
        <div>
          <Label htmlFor="region-country">Negara</Label>
          <div className="relative">
            <select
              id="region-country"
              value={country}
              onChange={(event) => onCountryChange(event.target.value)}
              disabled={disabled}
              className={SELECT_CLASS}
            >
              {withCurrent(COUNTRIES, country).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="region-city">Kota</Label>
        <div className="relative">
          <select
            id="region-city"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            disabled={disabled}
            className={SELECT_CLASS}
          >
            {cities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
        </div>
      </div>
    </div>
  )
}
