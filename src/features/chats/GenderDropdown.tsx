import { Check, ChevronDown, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type GenderFilter = 'all' | 'male' | 'female'

const OPTIONS: Array<{ value: GenderFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
]

/**
 * Filter GENDER — meniru `search_dropdown.dart` (mobile):
 * single-select, 3 opsi, TANPA field cari & TANPA footer.
 * Panel terancung menempel di bawah field; item terpilih berwarna primary,
 * bold, dan ada ikon centang di kanan. Pilih item = langsung terapkan.
 */
export function GenderDropdown({
  label = 'Gender',
  value,
  onChange,
  disabled,
}: {
  label?: string
  value: GenderFilter
  onChange: (value: GenderFilter) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const fieldRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0]

  function toggle() {
    if (disabled) return
    if (!open && fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenAbove(spaceBelow < 150 && spaceAbove > spaceBelow)
    }
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return
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
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={fieldRef}
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
        <UserRound className="h-4 w-4 shrink-0 text-muted-2" />
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] leading-none text-muted-2">{label}</span>
          <span className="mt-1 block truncate text-[12.5px] leading-none text-text">
            {current.label}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-2 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={label}
          className={cn(
            'absolute z-40 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl',
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <ul className="py-1">
            {OPTIONS.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] transition hover:bg-panel',
                      active ? 'font-bold text-primary' : 'text-text',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
