import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, avatarGradient, initials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  online?: boolean
  className?: string
  ring?: boolean
}

export function Avatar({ src, name, size = 44, online = false, className, ring = false }: AvatarProps) {
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <AvatarPrimitive.Root
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-panel',
          ring && 'ring-2 ring-surface',
        )}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          delayMs={src ? 300 : 0}
          className={cn(
            'flex h-full w-full items-center justify-center bg-gradient-to-br font-display font-semibold text-white',
            avatarGradient(name),
          )}
          style={{ fontSize: Math.max(11, size * 0.32) }}
        >
          {initials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-surface bg-online"
          style={{ width: Math.max(9, size * 0.24), height: Math.max(9, size * 0.24) }}
          aria-label="online"
        />
      ) : null}
    </span>
  )
}
