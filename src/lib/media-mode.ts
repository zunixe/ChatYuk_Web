/**
 * Mode penyimpanan media (`chat-photos`).
 *
 * Bucket bisa publik atau privat tanpa web perlu tahu di awal. Supaya tidak
 * selalu mencoba URL publik (yang menghasilkan 400 di console untuk bucket
 * privat), kegagalan pertama diingat lalu semua media berikutnya langsung
 * memakai signed URL.
 *
 * Cache disimpan di memori + `localStorage` agar bertahan antar-reload,
 * dan di-reset bila signed URL justru gagal (bucket dikembalikan publik).
 */

const KEY = 'chatyuk-media-private'

let privateMode: boolean | null = null

function readStored(): boolean {
  try {
    // Default PRIVAT: bucket `chat-photos` sekarang privat, dan signed URL
    // juga sah untuk bucket publik. Nilai '0' hanya diset bila signed URL
    // terbukti gagal (lihat markStoragePublic) agar bisa pulih otomatis.
    return window.localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function isStoragePrivate(): boolean {
  if (privateMode === null) privateMode = readStored()
  return privateMode
}

export function markStoragePrivate(): void {
  if (privateMode === true) return
  privateMode = true
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    /* localStorage bisa diblokir; abaikan */
  }
}

export function markStoragePublic(): void {
  if (privateMode === false) return
  privateMode = false
  try {
    window.localStorage.setItem(KEY, '0')
  } catch {
    /* abaikan */
  }
}
