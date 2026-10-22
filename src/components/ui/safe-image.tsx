import { useState, type ComponentProps } from 'react'
import { supabase } from '@/lib/supabase'

const BUCKET = 'chat-photos'

/** Ambil path storage dari URL publik Supabase (bila ada). */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index < 0) return null
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0] ?? '')
}

async function signedUrlFor(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * `<img>` dengan penguatan privasi:
 *
 * Bila URL publik `chat-photos` ditolak (bucket kelak dibuat privat),
 * gambar otomatis memakai signed URL. Selama bucket masih publik,
 * perilaku sama sekali tidak berubah (tanpa request tambahan).
 *
 * Android tidak terpengaruh: mobile memakai `storage.download()` ber-JWT.
 */
export function SafeImage({ src, onError, ...props }: ComponentProps<'img'>) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src)
  const [trackedSrc, setTrackedSrc] = useState(src)
  const [retried, setRetried] = useState(false)

  // Reset saat prop `src` berubah (pola render-time, bukan effect).
  if (trackedSrc !== src) {
    setTrackedSrc(src)
    setCurrentSrc(src)
    setRetried(false)
  }

  return (
    <img
      {...props}
      src={currentSrc}
      onError={(event) => {
        const path = currentSrc ? storagePathFromUrl(currentSrc) : null
        if (!retried && path) {
          setRetried(true)
          void signedUrlFor(path).then((signed) => {
            if (signed) setCurrentSrc(signed)
          })
          return
        }
        onError?.(event)
      }}
    />
  )
}
