import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/feedback'
import { resolveAvatar } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { PersonOption } from '@/lib/api/privacy'

const SOURCE_LABEL: Record<PersonOption['source'], string> = {
  friend: 'Teman',
  following: 'Mengikuti',
  chat: 'Riwayat chat',
}

export function PrivacyPeoplePicker({
  open,
  mode,
  people,
  selected,
  loading,
  onToggle,
  onClear,
  onDone,
}: {
  open: boolean
  mode: 'except' | 'only'
  people: PersonOption[]
  selected: string[]
  loading?: boolean
  onToggle: (uid: string) => void
  onClear: () => void
  onDone: () => void
}) {
  const [term, setTerm] = useState('')

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()
    if (!needle) return people
    return people.filter((person) => person.nickname.toLowerCase().includes(needle))
  }, [people, term])

  if (!open) return null

  return (
    <div className="mt-2 rounded-2xl border border-border bg-panel/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] text-muted">
          {mode === 'only'
            ? 'Pilih siapa yang BOLEH melihat (minimal 1 orang).'
            : 'Pilih siapa yang TIDAK boleh melihat.'}
          {' '}
          <span className="font-medium text-text">{selected.length} dipilih</span>
        </p>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[11px] text-muted-2 underline underline-offset-2 hover:text-text"
          >
            Kosongkan
          </button>
        ) : null}
      </div>

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Cari nama…"
          className="h-9 pl-8 text-[12.5px]"
          aria-label="Cari orang"
        />
      </div>

      <div className="mt-2 max-h-56 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11.5px] text-muted-2">
            Tidak ada kandidat. Berteman atau mulai chat dulu di aplikasi/beranda.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((person) => {
              const isSelected = selected.includes(person.uid)
              return (
                <li key={person.uid}>
                  <button
                    type="button"
                    onClick={() => onToggle(person.uid)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition',
                      isSelected ? 'bg-primary-soft' : 'hover:bg-panel',
                    )}
                  >
                    <Avatar src={resolveAvatar(person.avatar)} name={person.nickname} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-text">
                        {person.nickname}
                      </span>
                      <span className="text-[10px] text-muted-2">{SOURCE_LABEL[person.source]}</span>
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-surface text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="secondary" onClick={onDone}>
          <X className="h-3.5 w-3.5" />
          Selesai
        </Button>
      </div>
    </div>
  )
}
