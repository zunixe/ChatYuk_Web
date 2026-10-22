import { supabase } from '@/lib/supabase'

export interface AppSettings {
  requireRegistration: boolean
  callAnonEnabled: boolean
}

const DEFAULT: AppSettings = {
  requireRegistration: false,
  callAnonEnabled: false,
}

/**
 * Ambil setting global (`app_settings.id='global'`).
 * Bila gagal (offline / RLS), kembalikan default yang aman:
 *   require_registration=false (tidak memblokir), call_anon_enabled=false.
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('require_registration, call_anon_enabled')
      .eq('id', 'global')
      .maybeSingle()
    if (error || !data) return DEFAULT
    return {
      requireRegistration: Boolean(data.require_registration),
      callAnonEnabled: Boolean(data.call_anon_enabled),
    }
  } catch {
    return DEFAULT
  }
}
