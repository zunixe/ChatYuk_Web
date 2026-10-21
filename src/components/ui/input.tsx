import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/70 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] text-text outline-none transition placeholder:text-muted-2 focus:border-primary/70 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('mb-1.5 block text-[13px] font-medium text-muted', className)}
      {...props}
    />
  )
}
