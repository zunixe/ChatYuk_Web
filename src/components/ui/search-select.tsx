import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Dropdown single-select dengan pencarian live — meniru `SearchDropdown`
 * di aplikasi Android (`lib/widgets/search_dropdown.dart`), yang dipakai
 * untuk Umur, Negara, dan Kota:
 * - field berlabel + panah dropdown
 * - panel TERANCUNG menempel di bawah field
 * - field cari di atas daftar (autofocus) + teks "Tidak ditemukan"
 * - item terpilih berwarna primary + bold + centang
 * - buka ke atas bila ruang bawah tidak cukup
 */
export function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText = 'Tidak ditemukan',
  disabled,
  className,
  id,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder: string
  emptyText?: string
  disabled?: boolean
  className?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [query, setQuery] = useState('')
  const fieldRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.toLowerCase().includes(needle))
  }, [options, query])

  function toggle() {
    if (disabled) return
    if (!open && fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenAbove(spaceBelow < 200 && spaceAbove > spaceBelow)
    }
    setQuery('')
    setOpen((current) => !current)
  }

  useEffect(() => {
    if (!open) return
    // Android: autofocus pada field cari saat panel dibuka.
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 30)
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || fieldRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cn('relative', className)}>
      <button
        ref={fieldRef}
        id={id}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border bg-surface px-3 text-left transition',
          open ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border hover:bg-panel/60',
          disabled && 'opacity-60',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] leading-none text-muted-2">{label}</span>
          <span className="mt-1 block truncate text-[12.5px] leading-none text-text">
            {value || placeholder || '—'}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-2 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={cn(
            'absolute z-40 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl',
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {/* Field cari — sama seperti SearchDropdown Android */}
          <div className="border-b border-border/60 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12px] text-text outline-none placeholder:text-muted-2 focus:border-primary/50"
              />
            </div>
          </div>

          <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-[12px] text-muted-2">{emptyText}</li>
            ) : (
              filtered.map((option) => {
                const active = option === value
                return (
                  <li key={option}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(option)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] transition hover:bg-panel',
                        active ? 'font-bold text-primary' : 'text-text',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option}</span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
