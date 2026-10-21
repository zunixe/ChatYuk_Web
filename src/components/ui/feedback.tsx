import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}

export function FullPageSpinner({ label = 'Memuat ChatYuk…' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-bg text-muted">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-soft">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-panel-2', className)} />
}

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label="sedang mengetik">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
