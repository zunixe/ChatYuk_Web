import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  title,
  children,
  className,
  hideClose = false,
}: {
  title: string
  children: ReactNode
  className?: string
  hideClose?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-fade" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 text-text shadow-soft outline-none data-[state=open]:animate-in-up',
          className,
        )}
      >
        <DialogPrimitive.Title className="font-display text-base font-semibold">
          {title}
        </DialogPrimitive.Title>
        {!hideClose ? (
          <DialogPrimitive.Close className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-text">
            <X className="h-4 w-4" />
            <span className="sr-only">Tutup</span>
          </DialogPrimitive.Close>
        ) : null}
        <div className={hideClose ? '' : 'mt-3'}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SideSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[1px] data-[state=open]:animate-fade" />
        <DialogPrimitive.Content className="sheet-in fixed right-0 top-0 z-[61] flex h-dvh w-full max-w-sm flex-col border-l border-border bg-surface text-text shadow-soft outline-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <DialogPrimitive.Title className="font-display text-sm font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-panel hover:text-text">
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup</span>
            </DialogPrimitive.Close>
          </div>
          <div className="thin-scrollbar flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
