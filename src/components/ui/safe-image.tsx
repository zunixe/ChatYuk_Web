import { useEffect, useState, type ComponentProps } from 'react'
import { supabase } from '@/lib/supabase'
import { isStoragePrivate, markStoragePrivate, markStoragePublic } from '@/lib/media-mode'

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

function looksLikePublicStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}

/**
 * `<img>` dengan penguatan privasi.
 *
 * Bucket `chat-photos` privat → URL publik 400 → komponen otomatis beralih
 * ke signed URL. Kegagalan pertama diingat (`media-mode`) sehingga media
 * berikutnya langsung signed, tanpa 400 berulang di console.
 *
 * Android tidak terpengaruh: mobile memakai `storage.download()` ber-JWT.
 */
function initialSrc(src: string | undefined): string | undefined {
  // Mode privat sudah diketahui → jangan render URL publik (menghindari 400).
  if (src && isStoragePrivate() && looksLikePublicStorageUrl(src)) return undefined
  return src
}

export function SafeImage({ src, onError, ...props }: ComponentProps<'img'>) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => initialSrc(src))
  const [trackedSrc, setTrackedSrc] = useState(src)

  // Reset saat prop `src` berubah (pola render-time, bukan effect).
  if (trackedSrc !== src) {
    setTrackedSrc(src)
    setCurrentSrc(initialSrc(src))
  }

  useEffect(() => {
    if (!src || !isStoragePrivate() || !looksLikePublicStorageUrl(src)) return
    const path = storagePathFromUrl(src)
    if (!path) return
    void signedUrlFor(path).then((signed) => {
      if (signed) setCurrentSrc(signed)
      else markStoragePublic()
    })
  }, [src])

  return (
    <img
      {...props}
      src={currentSrc}
      onError={(event) => {
        const path = currentSrc ? storagePathFromUrl(currentSrc) : null
        if (!path) {
          onError?.(event)
          return
        }
        markStoragePrivate()
        void signedUrlFor(path).then((signed) => {
          if (signed) setCurrentSrc(signed)
          else {
            markStoragePublic()
            onError?.(event)
          }
        })
      }}
    />
  )
}
