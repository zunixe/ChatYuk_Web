import { supabase } from '@/lib/supabase'
import type { Provider } from '@supabase/supabase-js'

/**
 * Lapisan auth tunggal untuk komponen.
 *
 * Komponen (`features/*`) TIDAK boleh mengimpor `@/lib/supabase` langsung —
 * semua akses auth lewat modul ini agar batas layer tetap terjaga dan mudah
 * di-mock saat test.
 */

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { signup_source: 'chatyuk-web' } },
  })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signInAnonymously(source = 'chatyuk-web-anon'): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { signup_source: source } },
  })
  if (error) throw error
}

export async function signInWithOAuth(
  provider: Provider,
  redirectTo: string,
  queryParams?: Record<string, string>,
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, queryParams },
  })
  if (error) throw error
}

/** Upgrade akun anonim → email+password (UID tetap). */
export async function updateAccountCredentials(
  email: string,
  password: string,
): Promise<{ emailConfirmed: boolean }> {
  const { data, error } = await supabase.auth.updateUser({ email, password })
  if (error) throw error
  return {
    emailConfirmed: Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at),
  }
}

/** Tandai profil sebagai terdaftar setelah email terkonfirmasi. */
export async function markProfileRegistered(uid: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_registered: true, email })
    .eq('id', uid)
  if (error) throw error
}

/**
 * Ganti password akun email. Verifikasi password lama dulu (sama seperti
 * mobile: signInWithPassword lalu updateUser) agar sesi tidak bisa
 * dibajak untuk mengganti password tanpa tahu yang lama.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (verifyError) throw verifyError
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * Hapus akun sendiri (RPC server-side `delete_my_account`): arsip ke
 * `deleted_users` lalu purge profil + auth user. Sama dengan mobile.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
}
