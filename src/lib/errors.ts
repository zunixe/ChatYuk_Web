interface ErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

function asErrorLike(error: unknown): ErrorLike {
  if (typeof error === 'string') return { message: error }
  if (error && typeof error === 'object') return error as ErrorLike
  return {}
}

export function errorMessage(error: unknown): string {
  const { message = '', code = '', status } = asErrorLike(error)
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) return 'Email atau password salah.'
  if (lower.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Buka tautan verifikasi di inbox kamu.'
  }
  if (lower.includes('user already registered')) return 'Email sudah terdaftar. Coba masuk.'
  if (lower.includes('password should be at least')) return 'Password minimal 6 karakter.'
  if (lower.includes('unable to validate email')) return 'Format email tidak valid.'
  if (lower.includes('nickname_banned')) return 'Nickname tersebut tidak diperbolehkan.'
  if (lower.includes('rate limit') || status === 429) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  }
  if (lower.includes('row-level security') || code === '42501') {
    return 'Akses ditolak oleh aturan keamanan server.'
  }
  if (lower.includes('duplicate key') || code === '23505') {
    return 'Data sudah ada.'
  }
  if (lower.includes('jwt') || lower.includes('token')) {
    return 'Sesi kamu berakhir. Silakan masuk ulang.'
  }
  if (lower.includes('message too long')) return 'Pesan terlalu panjang (maksimal 2000 karakter).'
  if (lower.includes('invalid image data')) return 'File gambar tidak valid.'

  // Detail teknis jangan pernah ditampilkan ke pengguna: pesan PostgREST/GoTrue
  // bisa memuat nama fungsi, tabel, atau constraint internal. Cukup ke console.
  if (message) {
    console.error('[ChatYuk] unhandled error:', { message, code, status })
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
