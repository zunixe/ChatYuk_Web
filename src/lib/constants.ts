/**
 * Batas ukuran upload — satu sumber kebenaran.
 * Sebelumnya angka ini tersebar di ChatPage, SettingsPage, dan media.ts.
 */

const MB = 1024 * 1024

/** Gambar chat (dikompres dulu di klien). */
export const MAX_IMAGE_BYTES = 8 * MB
/** Dokumen/file chat — sama dengan batas mobile (`ChatFile.maxBytes`). */
export const MAX_FILE_BYTES = 50 * MB
/** Video chat (tanpa kompresi server-side di web). */
export const MAX_VIDEO_BYTES = 15 * MB
/** Durasi maksimum video chat (sama dengan mobile: 60 detik). */
export const MAX_VIDEO_MS = 60_000
/** Avatar profil. */
export const MAX_AVATAR_BYTES = 5 * MB
