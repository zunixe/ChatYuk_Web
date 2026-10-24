import { BarChart3, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { usePollResults, useVotePoll } from '@/hooks/usePoll'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

interface PollShape {
  q: string
  o: string[]
  m: boolean
}

function parsePoll(message: Message): PollShape | null {
  const raw = message.poll
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  const question = String(obj.q ?? '').trim()
  const options = Array.isArray(obj.o) ? obj.o.map((item) => String(item)) : []
  if (!question || options.length < 2) return null
  return { q: question, o: options, m: obj.m === true }
}

export function PollCard({
  message,
  disabled,
  room = false,
}: {
  message: Message
  disabled?: boolean
  room?: boolean
}) {
  const poll = parsePoll(message)
  const results = usePollResults([message.id], room)
  const vote = useVotePoll(room)
  const [pending, setPending] = useState<number[]>([])

  if (!poll) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-panel/70 px-2 py-1.5 text-[11.5px] text-muted">
        <BarChart3 className="h-3.5 w-3.5" /> Polling tidak valid
      </div>
    )
  }

  const data = results.data?.[String(message.id)]
  const mine = data?.mine ?? []
  const counts = data?.counts ?? []
  const total = counts.reduce((sum, n) => sum + n, 0)
  const selected = pending.length > 0 ? pending : mine

  function toggle(index: number) {
    if (disabled) return
    setPending((current) => {
      const base = current.length > 0 ? current : mine
      if (poll!.m) {
        return base.includes(index) ? base.filter((i) => i !== index) : [...base, index]
      }
      return [index]
    })
  }

  async function submit() {
    if (disabled || selected.length === 0) return
    try {
      await vote.mutateAsync({ messageId: message.id, options: selected })
      setPending([])
      toast.success('Suara terkirim.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="min-w-52 rounded-xl bg-panel/70 p-2.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-text">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        {poll.q}
      </div>

      <ul className="mt-1.5 space-y-1">
        {poll.o.map((option, index) => {
          const count = counts[index] ?? 0
          const percent = total > 0 ? Math.round((count / total) * 100) : 0
          const isMine = selected.includes(index)
          return (
            <li key={`${index}-${option}`}>
              <button
                type="button"
                onClick={() => toggle(index)}
                disabled={disabled}
                className={cn(
                  'relative block w-full overflow-hidden rounded-lg border px-2 py-1.5 text-left text-[11.5px] transition',
                  isMine
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border bg-surface text-muted hover:bg-panel',
                  disabled && 'cursor-default',
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                  style={{ width: `${percent}%` }}
                  aria-hidden
                />
                <span className="relative flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                  {isMine ? <Check className="h-3 w-3 shrink-0 text-primary" /> : null}
                  <span className="shrink-0 tabular-nums text-[10.5px] text-muted-2">{percent}%</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-2">
          {data ? `${data.voters} pemilih` : 'Memuat…'}
          {poll.m ? ' · bisa pilih banyak' : ' · satu pilihan'}
        </span>
        {selected.length > 0 && selected.join(',') !== mine.join(',') ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={vote.isPending}
            className="rounded-md bg-primary px-2 py-1 text-[10.5px] font-medium text-white disabled:opacity-60"
          >
            {vote.isPending ? 'Mengirim…' : 'Kirim suara'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
