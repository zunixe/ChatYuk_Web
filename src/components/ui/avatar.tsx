import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn, avatarGradient, initials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  online?: boolean
  className?: string
  ring?: boolean
  /**
   * Gender user — menentukan warna placeholder inisial, sama seperti
   * `GenderAvatar` di aplikasi Android:
   *   male   → biru  #2196F3
   *   female → pink  #E91E63
   *   lain   → cyan  #00BCD4 (accent)
   * Latar = warna gender 15%, teks & ring = warna gender.
   */
  gender?: string | null
}

const GENDER_COLORS: Record<string, string> = {
  male: '#2196F3',
  female: '#E91E63',
}
const ACCENT_COLOR = '#00BCD4'

function genderColor(gender?: string | null): string {
  return GENDER_COLORS[(gender ?? '').toLowerCase()] ?? ACCENT_COLOR
}

const BUCKET = 'chat-photos'

function avatarStoragePath(url: string | null | undefined): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = (url ?? '').indexOf(marker)
  if (index < 0) return null
  return decodeURIComponent((url ?? '').slice(index + marker.length).split('?')[0] ?? '')
}

export function Avatar({
  src,
  name,
  size = 44,
  online = false,
  className,
  ring = false,
  gender,
}: AvatarProps) {
  const tone = genderColor(gender)
  const [currentSrc, setCurrentSrc] = useState(src ?? undefined)
  const [trackedSrc, setTrackedSrc] = useState(src)
  const [retried, setRetried] = useState(false)

  // Reset saat prop `src` berubah (pola render-time, bukan effect).
  if (trackedSrc !== src) {
    setTrackedSrc(src)
    setCurrentSrc(src ?? undefined)
    setRetried(false)
  }

  function handleStatus(status: 'idle' | 'loading' | 'loaded' | 'error') {
    if (status !== 'error') return
    const path = avatarStoragePath(currentSrc)
    if (retried || !path) return
    setRetried(true)
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setCurrentSrc(data.signedUrl)
      })
  }

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
        // Border gender digambar di LUAR Root supaya tidak terpotong
        // `overflow-hidden` (dulu terasa "keutup"/tidak rata di tepi).
        style={
          gender
            ? { boxShadow: `0 0 0 1.5px ${tone}` }
            : undefined
        }
      >
        {src ? (
          <AvatarPrimitive.Image
            src={currentSrc}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
            onLoadingStatusChange={handleStatus}
          />
        ) : null}
        <AvatarPrimitive.Fallback
          delayMs={src ? 300 : 0}
          className={cn(
            'flex h-full w-full items-center justify-center font-display font-semibold',
            // Tanpa gender: perilaku lama (gradien acak, teks putih).
            !gender && 'bg-gradient-to-br text-white',
            !gender && avatarGradient(name),
          )}
          style={
            gender
              ? {
                  fontSize: Math.max(11, size * 0.32),
                  // Latar 15% (sama seperti GenderAvatar Android).
                  backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`,
                  color: tone,
                }
              : { fontSize: Math.max(11, size * 0.32) }
          }
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
