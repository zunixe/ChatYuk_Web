import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  children,
  label,
  side = 'right',
}: {
  children: ReactNode
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root delayDuration={350}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-[80] rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-surface shadow-soft data-[state=delayed-open]:animate-fade"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-text" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function TooltipContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Content
      className={cn('z-[80] rounded-lg bg-text px-2.5 py-1.5 text-xs text-surface', className)}
      {...props}
    />
  )
}
