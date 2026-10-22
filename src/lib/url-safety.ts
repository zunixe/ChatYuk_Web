/**
 * Sanitasi URL yang berasal dari data pengguna (pesan/chat).
 *
 * Nilai dari server TIDAK dipercaya: `href`/`src` yang dibuat dari string
 * mentah bisa berisi `javascript:` (XSS), `file:`, atau skema lain.
 * Semua helper di sini mengembalikan null bila tidak aman, sehingga
 * komponen tidak merender tautan/aset tersebut.
 */

const ALLOWED_MEDIA_SCHEMES = ['https:', 'blob:']
const ALLOWED_DATA_PREFIXES = ['data:image/', 'data:audio/']

/**
 * URL untuk `<img>`/`<audio>`/`<video>`/`<a>` media.
 * Diizinkan: https:, blob:, data:image/*, data:audio/*.
 */
export function safeMediaUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const lower = raw.toLowerCase()

  if (lower.startsWith('data:')) {
    return ALLOWED_DATA_PREFIXES.some((prefix) => lower.startsWith(prefix)) ? raw : null
  }
  try {
    // Base aman agar relative path tetap bisa diurai tanpa `window`.
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://localhost'
    const url = new URL(raw, base)
    if (ALLOWED_MEDIA_SCHEMES.includes(url.protocol)) return url.href
    return null
  } catch {
    return null
  }
}

/** Nomor telepon → href `tel:` yang aman (hanya digit, boleh + di depan). */
export function safePhoneHref(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const compact = raw.replace(/[\s().-]/g, '')
  if (!/^\+?\d{6,15}$/.test(compact)) return null
  return `tel:${compact}`
}

/** Label telepon untuk ditampilkan (tanpa karakter aneh). */
export function safePhoneLabel(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const compact = raw.replace(/[\s().-]/g, '')
  if (!/^\+?\d{6,15}$/.test(compact)) return null
  return raw
}

/** Koordinat peta yang valid (dalam rentang bumi). */
export function safeMapUrl(
  lat: unknown,
  lng: unknown,
): string | null {
  // null/undefined/'' jangan dianggap 0 (Number(null) === 0).
  if (lat === null || lat === undefined || lat === '') return null
  if (lng === null || lng === undefined || lng === '') return null
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null
  return `https://maps.google.com/?q=${latitude},${longitude}`
}
