/**
 * Resolusi media via signed URL (bucket privat).
 *
 * Digunakan hanya setelah bucket `chat-photos` diubah menjadi privat.
 * Sampai itu terjadi, fungsi ini TIDAK dipakai (web tetap pakai
 * `storagePublicUrl`).
 *
 * Kontrak:
 * - URL berlaku `EXPIRY_SEC` (1 jam).
 * - Cache per path di memory, refresh bila tersisa ≤ 5 menit.
 * - Gagal → null (komponen menampilkan placeholder).
 */
import { supabase } from '@/lib/supabase'

const EXPIRY_SEC = 3600
const REFRESH_MARGIN_SEC = 300

interface SignedEntry {
  url: string
  expiresAt: number
}

const cache = new Map<string, SignedEntry>()

export async function signedMediaUrl(path: string | null | undefined): Promise<string | null> {
  const raw = (path ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  const now = Date.now()
  const cached = cache.get(raw)
  if (cached && cached.expiresAt - now > REFRESH_MARGIN_SEC * 1000) {
    return cached.url
  }

  try {
    const { data, error } = await supabase.storage
      .from('chat-photos')
      .createSignedUrl(raw, EXPIRY_SEC)
    if (error || !data?.signedUrl) return cached?.url ?? null
    cache.set(raw, { url: data.signedUrl, expiresAt: now + EXPIRY_SEC * 1000 })
    return data.signedUrl
  } catch {
    return cached?.url ?? null
  }
}

/** Bersihkan cache (mis. setelah logout). */
export function clearSignedMediaCache(): void {
  cache.clear()
}
