import { Check, ChevronDown, FilterX, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ALL_COUNTRIES, countriesCountText } from '@/lib/countries'
import { cn } from '@/lib/utils'

/**
 * Filter NEGARA — meniru `filter_dropdown.dart` (mobile):
 * - field berlabel + ikon public + panah, teks "Semua negara" saat kosong,
 *   nama negara saat 1 dipilih, "N negara" saat lebih.
 * - panel TERANCUNG menempel di bawah field: pencarian live + checklist
 *   (checkbox di KANAN) + footer Reset / "Terapkan (n)".
 * - commit HANYA saat Terapkan; tap di luar = BATAL.
 */
export function CountryMultiSelect({
  label = 'Negara',
  selected,
  onApply,
  disabled,
}: {
  label?: string
  selected: string[]
  onApply: (countries: string[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [query, setQuery] = useState('')
  const [temp, setTemp] = useState<string[]>([])
  const tempRef = useRef<string[]>([])
  const fieldRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const fieldText =
    selected.length === 0
      ? 'Semua negara'
      : selected.length === 1
        ? selected[0]
        : countriesCountText(selected.length)

  // Sama seperti mobile: `allCountries` dipakai apa adanya (sudah alfabetis).
  const options = ALL_COUNTRIES

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((country) => country.toLowerCase().includes(needle))
  }, [options, query])

  function updateTemp(next: string[] | ((cur: string[]) => string[])) {
    setTemp((current) => {
      const value = typeof next === 'function' ? next(current) : next
      tempRef.current = value
      return value
    })
  }

  function openPanel() {
    if (disabled) return
    // Sama seperti mobile: buka ke atas bila ruang bawah < 150px.
    if (fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenAbove(spaceBelow < 150 && spaceAbove > spaceBelow)
    }
    tempRef.current = selected
    setTemp(selected)
    setQuery('')
    setOpen(true)
  }

  function cancel() {
    setOpen(false)
    setQuery('')
  }

  function apply() {
    onApply(tempRef.current)
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || fieldRef.current?.contains(target)) return
      // Tap di luar = batal (tidak commit).
      cancel()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={fieldRef}
        type="button"
        onClick={() => (open ? cancel() : openPanel())}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border bg-surface px-3 text-left transition',
          open ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border hover:bg-panel/60',
          disabled && 'opacity-60',
        )}
      >
        <GlobeIcon />
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] leading-none text-muted-2">{label}</span>
          <span className="mt-1 block truncate text-[12.5px] leading-none text-text">
            {fieldText}
          </span>
        </span>
        {selected.length > 0 ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Kosongkan negara"
            onClick={(event) => {
              event.stopPropagation()
              onApply([])
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation()
                onApply([])
              }
            }}
            className="shrink-0 rounded p-0.5 text-muted-2 hover:text-text"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-2 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Filter negara"
          className={cn(
            'absolute z-40 w-[calc(100%+96px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-xl',
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {/* Pencarian live */}
          <div className="border-b border-border/60 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari negara"
                aria-label="Cari negara"
                autoFocus
                className="h-10 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12px] text-text outline-none placeholder:text-muted-2 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Checklist — checkbox di KANAN (sama seperti CheckboxListTile) */}
          <ul className="max-h-[240px] overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-[12px] text-muted-2">-</li>
            ) : (
              filtered.map((country) => {
                const checked = temp.includes(country)
                return (
                  <li key={country}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() =>
                        updateTemp((current) =>
                          checked ? current.filter((c) => c !== country) : [...current, country],
                        )
                      }
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] text-text transition hover:bg-panel"
                    >
                      <span className="min-w-0 flex-1 truncate">{country}</span>
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                          checked
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-surface text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <div className="border-t border-border/60" />

          {/* Footer: Reset + Terapkan (commit hanya di sini) */}
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <button
              type="button"
              onClick={() => updateTemp([])}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-semibold text-muted transition hover:bg-panel"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={apply}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11.5px] font-semibold text-white transition hover:bg-primary-strong"
            >
              <Check className="h-3.5 w-3.5" />
              Terapkan ({temp.length})
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted-2" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}
