# ChatYuk Web

WhatsApp Web–style SPA untuk ChatYuk. Chat 1:1 realtime, login email/password,
tanpa E2EE. Frontend React 19 + Vite + TypeScript + Tailwind v4, backend
Supabase (lokal di instabox, siap switch ke cloud lewat runtime config).

## Fitur

- Halaman awal ala Android: form profil (nama, gender, umur, negara, kota) untuk mulai sebagai tamu, plus Google dan email.
- Login email (`/login/email`), daftar, onboarding profil, dan sesi persisten.
- Daftar chat dua panel, pencarian, filter belum dibaca, mulai chat baru.
- Pesan teks/gambar realtime, optimistic send, retry, typing indicator,
  read receipt, reply, reaksi emoji, dan viewer gambar.
- Profil kontak, pengaturan profil/avatar, privasi, tema, dan logout.
- Cache offline Dexie untuk daftar chat dan pesan.
- PWA (manifest + service worker) dan runtime config tanpa rebuild.

## Testing

Unit test web memakai Vitest dan **mencerminkan test Android** (bukan
menjalankan file Dart-nya). Padanan utama:

| Android (`test/`) | Web (`src/lib/__tests__/`) |
| --- | --- |
| `banned_nickname_test.dart` | `nickname.test.ts` |
| `chat_list_group_sort_test.dart` | `chats.test.ts` (sort pinned + terbaru) |
| `chat_list_hidden_filter_test.dart` | `chats.test.ts` (hidden/pinned/muted) |
| `message_time_align_test.dart` | `time.test.ts` (format HH.mm, hari) |
| data `regions_data_*.dart` | `regions.test.ts` (141 negara, kota, umur) |

```bash
npm test          # sekali jalan
npm run test:watch
```

## Login Google (dev)

Tombol Google memakai Supabase OAuth. Agar berhasil, tambahkan
`http://127.0.0.1:54321/auth/v1/callback` ke **Authorized redirect URIs** pada
OAuth Client tipe Web di Google Cloud Console (client ID
`599111437536-hg56bq0nc2m6kig6hg41lmrbtfel5n2c`). Tanpa itu Google
mengembalikan `redirect_uri_mismatch`.

## Development

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

Backend lokal diekspos lewat ngrok dan dikonfigurasi di
`public/runtime-config.js`. Untuk pengembangan langsung ke Supabase lokal:

```js
window.__CHATYUK_CONFIG__.supabaseUrl = 'http://127.0.0.1:54321'
```

## Deploy

Build statis disajikan Caddy di VM instabox (`:8080`); Caddy juga mem-proxy
`/rest`, `/auth`, `/storage`, `/realtime`, `/functions`, dan `/graphql` ke Kong
Supabase. Ngrok meneruskan ke Caddy.

```bash
npm run build
ssh -p 2222 ibssh_pkaewaqds244ilfseabkwddeeu@api.instabox.sh \
  'rm -rf /data/workspace/chatyuk-web/dist'
tar czf - dist | ssh -p 2222 ibssh_pkaewaqds244ilfseabkwddeeu@api.instabox.sh \
  'tar xzf - -C /data/workspace/chatyuk-web'
ssh -p 2222 ibssh_pkaewaqds244ilfseabkwddeeu@api.instabox.sh \
  'sudo systemctl reload chatyuk-web'
```

Service unit dan konfigurasi ada di `deploy/`. Panduan VM/Supabase lengkap:
`../chatyuk/INSTABOX.md`.

## Switch lokal → production

Edit `dist/runtime-config.js` di server (atau `public/runtime-config.js` sebelum
build), lalu reload halaman. Tidak perlu rebuild:

```js
window.__CHATYUK_CONFIG__ = {
  env: 'prod',
  supabaseUrl: 'https://fohcucyyejdryryoxitm.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
  // ...
}
```

Jangan pernah memakai service-role/secret key di frontend ini.

## Catatan

- Ngrok free menampilkan halaman peringatan sekali per browser. Setelah
  **Visit Site**, cookie ngrok membuat aset termuat normal; request XHR/fetch
  memakai header `ngrok-skip-browser-warning`.
- `presence_for` lokal diperbaiki oleh migrasi
  `20261020150000_fix_presence_for_invisible_uid.sql`.

## Sinkronisasi dengan aplikasi mobile

Web dan mobile memakai database serta kanal Realtime yang sama:

- Chat 1:1 memakai `chat_id` deterministik `uidA_uidB` (di-sort).
- Keduanya hanya menulis ke `private_messages`; trigger
  `handle_new_private_message` memperbarui `last_message`,
  `last_message_at`, `last_sender_id`, `message_count`, dan `unread_counts`
  di `private_chats`.
- Pesan, edit, hapus, reaksi, dan perubahan `private_chats` diterima lewat
  `postgres_changes`; typing memakai broadcast `typing-<chatId>`.
- Read receipt memakai RPC `mark_chat_read`; presence web menulis
  `profiles.status`/`last_seen`, yang dipantau aplikasi mobile.
- Chat tersembunyi (`hidden_by`) dihormati; mengirim pesan dari web
  meng-unhide chat seperti perilaku mobile. Chat tanpa pesan
  (`message_count = 0`) tidak ditampilkan di daftar.

Sudah diuji dua arah pada 2026-10-20: pesan dari web diterima klien
Supabase kedua secara realtime (id 7), pesan dari klien kedua tampil di web
(id 8), unread count bertambah, dan read receipt web memperbarui
`last_read_at` yang dibaca mobile.
