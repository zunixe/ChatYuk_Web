import i18n from '@/lib/i18n'

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

/** Terjemahan dengan fallback aman bila i18n belum siap (mis. unit test). */
function tr(key: string, fallback: string): string {
  try {
    const value = i18n.t(key)
    return value && value !== key ? value : fallback
  } catch {
    return fallback
  }
}

/**
 * Pesan error untuk pengguna.
 *
 * TIDAK pernah menampilkan pesan mentah server (bisa membocorkan nama
 * fungsi/tabel internal). Semua kasus dipetakan ke kalimat aman.
 */
export function errorMessage(error: unknown): string {
  const { message = '', code = '', status } = asErrorLike(error)
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) return tr('error.invalidLogin', 'Wrong email or password.')
  if (lower.includes('email not confirmed')) {
    return tr('error.emailTaken', 'That email is already registered.')
  }
  if (lower.includes('user already registered')) return tr('error.emailTaken', 'That email is already registered.')
  if (lower.includes('password should be at least')) return tr('error.tooLong', 'Password is too short.')
  if (lower.includes('unable to validate email')) return tr('error.emailTaken', 'Invalid email address.')
  if (lower.includes('nickname_banned')) return tr('error.generic', 'That nickname is not allowed.')
  if (lower.includes('rate limit') || status === 429) {
    return tr('error.rateLimited', 'Too many attempts. Please wait a moment.')
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return tr('error.network', "Can't reach the server. Check your connection.")
  }
  if (lower.includes('row-level security') || code === '42501') {
    return tr('error.generic', 'Something went wrong. Please try again.')
  }
  if (lower.includes('duplicate key') || code === '23505') {
    return tr('error.emailTaken', 'That data already exists.')
  }
  if (lower.includes('message too long')) return tr('error.tooLong', 'Message is too long (max 2000 characters).')
  // Server menolak pesan karena salah satu pihak saling memblokir.
  if (lower.includes('blocked')) {
    return tr('error.blocked', "You can't message this contact.")
  }
  if (lower.includes('invalid image data')) return tr('error.invalidImage', 'That image file is not valid.')
  if (message) {
    // Detail teknis jangan tampil ke pengguna — cukup log di console.
    console.error('[ChatYuk] unhandled error:', { message, code, status })
  }
  return tr('error.generic', 'Something went wrong. Please try again.')
}
