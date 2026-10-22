/**
 * Aturan laporan pengguna (murni, tanpa dependensi jaringan/Supabase)
 * supaya bisa diuji unit tanpa environment browser.
 */

export const REPORT_REASON_MAX = 500

/** Return null bila alasan valid. */
export function validateReportReason(reason: string): string | null {
  const trimmed = reason.trim()
  if (!trimmed) return 'Alasan laporan wajib diisi.'
  if (trimmed.length > REPORT_REASON_MAX) {
    return `Alasan laporan maksimal ${REPORT_REASON_MAX} karakter.`
  }
  return null
}
