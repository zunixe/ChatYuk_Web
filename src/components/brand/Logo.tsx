import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary via-sky-500 to-accent text-white shadow-[0_12px_28px_-14px_rgb(33_150_243/0.9)]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M6.5 13.2c0-4.4 4.2-8 9.5-8s9.5 3.6 9.5 8-4.2 8-9.5 8c-1.2 0-2.4-.2-3.5-.5l-4.4 2 1.1-3.7a7.3 7.3 0 0 1-2.7-5.8Z"
          fill="currentColor"
        />
        <circle cx="11.9" cy="13.2" r="1.35" fill="#2196f3" />
        <circle cx="16" cy="13.2" r="1.35" fill="#2196f3" />
        <circle cx="20.1" cy="13.2" r="1.35" fill="#2196f3" />
      </svg>
    </span>
  )
}

export function Logo({
  className,
  subtitle,
}: {
  className?: string
  subtitle?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-[17px] font-semibold tracking-tight text-text">
          ChatYuk
        </div>
        {subtitle ? <div className="text-[11px] font-medium text-muted">{subtitle}</div> : null}
      </div>
    </div>
  )
}
