import { createClient } from '@supabase/supabase-js'
import { authStorageKey, config } from '@/lib/runtime-config'

const tunnelHeaders: Record<string, string> = config.supabaseUrl.includes('ngrok-free')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {}

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: authStorageKey(),
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
  global: {
    headers: {
      'x-application-name': 'chatyuk-web',
      ...tunnelHeaders,
    },
  },
})

export async function checkBackendHealth(): Promise<{
  ok: boolean
  auth: boolean
  rest: boolean
  message?: string
}> {
  try {
    const [authRes, restRes] = await Promise.all([
      fetch(`${config.supabaseUrl}/auth/v1/health`, {
        headers: { apikey: config.supabaseAnonKey, ...tunnelHeaders },
      }),
      fetch(`${config.supabaseUrl}/rest/v1/`, {
        headers: { apikey: config.supabaseAnonKey, ...tunnelHeaders },
      }),
    ])
    return {
      ok: authRes.ok && restRes.ok,
      auth: authRes.ok,
      rest: restRes.ok,
      message:
        authRes.ok && restRes.ok
          ? undefined
          : `auth ${authRes.status} · rest ${restRes.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      auth: false,
      rest: false,
      message: error instanceof Error ? error.message : 'Tidak dapat terhubung',
    }
  }
}
