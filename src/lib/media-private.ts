/**
 * Perubahan media privat (C1) — DOKUMENTASI, belum diterapkan ke web.
 *
 * Status: uji bucket percobaan LULUS (2026-10-22).
 *   upload 200 · signed URL 200 · publik 400 · tanpa token 400.
 *
 * Untuk diterapkan nanti:
 * 1. Ganti `storagePublicUrl()`/`messageImageSrc()`/`mediaUrl()` agar
 *    memakai `signedMediaUrl()` dari `media-signed.ts`.
 * 2. Ubah bucket `chat-photos` → `public = false` + hapus policy
 *    `chat_photos_public_read`.
 * 3. Buat policy SELECT privat (peserta chat) di server:
 *    `bucket_id='chat-photos' and storage_object_owner_ok(name)`.
 * 4. Avatar & sticker ikut kena signed URL → uji ulang seluruh UI.
 * 5. Tambah `clearSignedMediaCache()` saat logout.
 *
 * Risiko: semua media web perlu re-sign; cache + refresh wajib.
 * Dampak mobile: TIDAK ada (mobile pakai `storage.download()` ber-JWT).
 *
 * Jangan diterapkan tanpa keputusan eksplisit — bucket publik sekarang
 * adalah perilaku yang diandalkan avatar/sticker/chat.
 */
export const MEDIA_PRIVACY_DECISION = 'pending' as const
