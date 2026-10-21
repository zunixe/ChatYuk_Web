export type AppEnv = 'local' | 'prod' | 'custom'

export interface FeatureFlags {
  replyMeta: boolean
  polls: boolean
  webPush: boolean
  calls: boolean
}

export interface RuntimeConfig {
  env: AppEnv
  supabaseUrl: string
  supabaseAnonKey: string
  features: FeatureFlags
}

declare global {
  interface Window {
    __CHATYUK_CONFIG__?: Partial<RuntimeConfig>
  }
}

const DEFAULT_FEATURES: FeatureFlags = {
  replyMeta: true,
  polls: true,
  webPush: false,
  calls: false,
}

function trimUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function readConfig(): RuntimeConfig {
  const runtime = window.__CHATYUK_CONFIG__ ?? {}
  const url =
    runtime.supabaseUrl?.trim() ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
    'http://127.0.0.1:54321'
  const anonKey =
    runtime.supabaseAnonKey?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    ''

  if (!anonKey) {
    // Keep the app bootable so the UI can show a helpful configuration error.
    console.error('[ChatYuk] supabaseAnonKey belum diisi di runtime-config.js')
  }

  const env: AppEnv =
    runtime.env === 'prod' || runtime.env === 'local' || runtime.env === 'custom'
      ? runtime.env
      : 'custom'

  return {
    env,
    supabaseUrl: trimUrl(url),
    supabaseAnonKey: anonKey,
    features: { ...DEFAULT_FEATURES, ...(runtime.features ?? {}) },
  }
}

export const config = readConfig()

export const envLabel = config.env === 'prod' ? 'PRODUCTION' : config.env.toUpperCase()

export const isLocalEnv = config.env === 'local'

export function supabaseHost(): string {
  try {
    return new URL(config.supabaseUrl).host
  } catch {
    return config.supabaseUrl
  }
}

export function authStorageKey(): string {
  return `chatyuk-web-${config.env}`
}
