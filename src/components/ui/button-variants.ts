import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-[0_10px_24px_-12px_rgb(33_150_243/0.85)] hover:bg-primary-strong',
        secondary:
          'border border-border bg-surface text-text hover:bg-panel',
        ghost: 'text-text hover:bg-panel',
        outline: 'border border-border bg-transparent text-text hover:bg-panel',
        soft: 'bg-primary-soft text-primary hover:bg-primary/15',
        danger: 'bg-danger text-white hover:brightness-95',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-[15px]',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)
