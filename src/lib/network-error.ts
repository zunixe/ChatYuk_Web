/**
 * Error yang layak diantrekan (bukan kesalahan validasi/permission).
 *
 * Selain pesan teks, kita juga mengenali bentuk error Supabase/PostgREST:
 * kegagalan jaringan biasanya muncul sebagai `status: 0`, tanpa `code`,
 * atau dengan `name: TypeError`. Tanpa ini, pesan offline tidak masuk antrean.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false

  const record =
    typeof error === 'object' ? (error as Record<string, unknown>) : null
  const text = (
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(record?.message ?? '')
  ).toLowerCase()

  if (text.includes('failed to fetch')) return true
  if (text.includes('networkerror')) return true
  if (text.includes('network request failed')) return true
  if (text.includes('load failed')) return true
  if (text.includes('timeout')) return true
  if (text.includes('connection')) return true
  if (text.includes('offline')) return true
  if (text.includes('err_internet_disconnected')) return true
  if (text.includes('err_network')) return true

  if (record) {
    if (record.name === 'TypeError') return true
    // PostgREST/Supabase: kegagalan jaringan → status 0 / tidak ada status.
    if (record.status === 0) return true
    if (typeof record.code === 'string' && record.code === '') return true
  }

  return false
}
