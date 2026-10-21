/**
 * Konfigurasi runtime ChatYuk Web.
 *
 * Ganti dua nilai di bawah untuk pindah backend tanpa rebuild:
 *  - local : Supabase lokal di instabox (via ngrok/Caddy)
 *  - prod  : https://fohcucyyejdryryoxitm.supabase.co
 *
 * File ini di-serve tanpa cache oleh Caddy (lihat deploy/Caddyfile).
 */
window.__CHATYUK_CONFIG__ = {
  env: 'local',
  supabaseUrl: 'https://defense-subtract-untrimmed.ngrok-free.dev',
  supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  features: {
    replyMeta: true,
    polls: true,
    webPush: false,
    calls: false,
  },
}
