# ChatYuk Web — Konfigurasi

Catatan konfigurasi ChatYuk Web (SPA di `~/Documents/chatyuk-web`) beserta
backend Supabase lokal yang dipakainya. Status terakhir: **2026-10-21**.

Repo web terpisah dari repo Flutter (`~/Documents/chatyuk`). Dokumen backend
VM/ngrok ada di `chatyuk/INSTABOX.md`; dokumen ini fokus pada sisi web.

---

## 1. Ringkasan

| Item | Nilai |
|---|---|
| Path repo | `~/Documents/chatyuk-web` |
| Stack | React 19 + Vite + TypeScript + Tailwind v4 |
| Backend | Supabase lokal di instabox (via ngrok → Caddy) |
| URL publik | `https://defense-subtract-untrimmed.ngrok-free.dev` |
| Env aktif | `local` (belum switch ke cloud) |
| Served by | Caddy `:8080` (`chatyuk-web.service`) + `ngrok.service` |
| Build di VM | `/data/workspace/chatyuk-web/dist` |

Arsitektur satu origin: ngrok → Caddy `:8080` → (`/rest`, `/auth`, `/storage`,
`/realtime`, `/functions`, `/graphql`, `/pg`) di-proxy ke Kong `127.0.0.1:54321`;
sisanya file statis SPA. Tujuannya menghindari CORS dan agar WebSocket realtime
ikut lewat domain yang sama.

---

## 2. Runtime config (tanpa rebuild)

File: `public/runtime-config.js` → disalin ke `dist/runtime-config.js`.

```js
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
```

- Ganti `supabaseUrl` + `supabaseAnonKey` untuk pindah backend **tanpa build ulang**.
- `runtime-config.js` di-serve `Cache-Control: no-store` oleh Caddy.
- Nilai produksi (jangan dipakai tanpa izin):
  `https://fohcucyyejdryryoxitm.supabase.co` +
  `sb_publishable_aFQQbXscy1mqVq5jHX7p2w_wzs2GAKg`.
- Kunci secret (`sb_secret_...`) **tidak boleh** masuk ke SPA.
- `authStorageKey()` membedakan sesi per env, jadi sesi local vs prod tidak bentrok.

---

## 3. Kredensial & kunci lokal

| Item | Nilai |
|---|---|
| Publishable key | `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` |
| Secret key (server only) | lihat `.secrets/local-keys.txt` — **jangan di-commit** |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | `http://127.0.0.1:54323` (internal VM) |
| Mailpit | `http://127.0.0.1:54324` (internal VM) |

Akun uji web (dibuat manual, bukan user produksi).

**Akun dummy (fixture test, wajib dipakai untuk pesan uji per `AGENTS.md`)**
terdaftar juga di `dummy_accounts`:

| UID | Nickname |
|---|---|
| `d0000001-0000-4000-8000-00000000000a` | DummyAlpha |
| `d0000002-0000-4000-8000-00000000000b` | DummyBeta |

Fixture chat: `d0000001-…_d0000002-…` — 3 pesan berawalan `[TEST]`.
Bersihkan dengan menghapus baris `private_messages` ber-`text like '[TEST]%'`
lalu perbaiki `private_chats.last_message`/`message_count`.

| Email | Password |
|---|---|
| `raka.web@chatyuk.test` | `Rahasia123!` |
| `sari.web@chatyuk.test` | `Rahasia123!` |
| `zunixe@gmail.com` (Google) | — (OAuth) |
| `dummy.alpha@chatyuk.test` | `DummyTest123!` |
| `dummy.beta@chatyuk.test` | `DummyTest123!` |

---

## 4. Google Sign-In (Web OAuth)

### 4.1 Client yang dipakai

| Item | Nilai |
|---|---|
| Nama client | **ChatYuk Web Dev (ngrok)** |
| Client ID | `599111437536-1amalukmipfm1a71e4ilj4pbucuiggdk.apps.googleusercontent.com` |
| Client secret | lihat `.secrets/google-web-dev.txt` (tidak ditulis di dokumen ini) |
| Project GCP | `chatyuk-7c9e4` |
| Authorized redirect URI | `https://defense-subtract-untrimmed.ngrok-free.dev/auth/v1/callback` |

Client ini **khusus dev** dan terpisah dari client produksi.

> ⚠️ **Jangan reset/ubah OAuth client `ChatYuk Admin Web`
> (`…hg56bq0nc2m6kig6hg41lmrbtfel5n2c`).** Client itu dipakai aplikasi
> Android produksi sebagai `serverClientId`/`aud` (lihat
> `chatyuk/CONFIG.md`). Mengubah secret-nya berisiko mengganggu Google
> Sign-In produksi.

### 4.2 Kenapa client terpisah

Login mobile memakai **ID token** (secret tidak dipakai), sedangkan login web
memakai **OAuth authorization code** yang **wajib** menukar `code` dengan
`client_secret` asli di server. Supabase lokal sebelumnya memakai secret dummy
(`local-dev-unused-idtoken-flow`) sehingga muncul
`Unable to exchange external code`. Solusinya client dev khusus web.

### 4.3 Konfigurasi Supabase lokal

File: `/data/workspace/chatyuk/supabase/config.toml`

```toml
[auth.external.google]
enabled = true
client_id = "599111437536-1amalukmipfm1a71e4ilj4pbucuiggdk.apps.googleusercontent.com,599111437536-pc5vquunrmjoqvvq4hs5rpj2ec8tf26k.apps.googleusercontent.com"
secret = "<lihat .secrets/google-web-dev.txt>"
redirect_uri = "https://defense-subtract-untrimmed.ngrok-free.dev/auth/v1/callback"
skip_nonce_check = false
```

Terkait di `[auth]`:

```toml
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000", "https://defense-subtract-untrimmed.ngrok-free.dev/**"]
enable_anonymous_sign_ins = true
minimum_password_length = 6
enable_confirmations = false
```

Catatan:

- `client_id` berisi **dua** ID: client dev web + Android Play Signing
  (`…pc5vq…`). Android Play tetap diperlukan agar `aud` token mobile valid.
  Client Android apkpure (`…r1rb2…`) tidak dimasukkan ke lokal.
- Env yang benar-benar dipakai container:
  `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, `GOTRUE_EXTERNAL_GOOGLE_SECRET`,
  `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`.
- Secret disimpan terpisah di `.secrets/google-web-dev.txt` (chmod 600) dan
  sudah masuk `.gitignore`. Secret juga ada di `config.toml` VM apa adanya
  (GoTrue butuh nilai asli).
- Env ini **hanya terbentuk saat `supabase start`**, bukan saat
  `docker restart supabase_auth_ChatYuk`. Setelah mengubah `config.toml`,
  wajib `supabase stop` + `supabase start`.

### 4.4 Alur di aplikasi web

Tombol Google memanggil:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/chats`,
    queryParams: { prompt: 'select_account' },
  },
})
```

- `flowType: 'pkce'` + `detectSessionInUrl: true` → code ditukar otomatis.
- Implicit fallback mengembalikan `#access_token=...` (terlihat saat uji
  manual `/auth/v1/authorize`), ditangani Supabase JS.
- User baru (belum punya profil) otomatis diarahkan ke `/onboarding`.
- Sudah diuji 2026-10-21: tombol Google → account chooser
  (`zunixe@gmail.com`) → `/onboarding` tanpa error. Akun Google tersebut
  kini punya user ChatYuk di DB lokal (uid `1c7752ea-47f6-4cbe-a2c8-a2b59582555e`).

---

## 5. Routing & auth flow

| Route | Isi |
|---|---|
| `/login` | Halaman awal ala Android: form profil (nama, gender, umur, negara, kota) → anon; tombol Google; link daftar/masuk email |
| `/login/email` | Login email + password (+ Google) |
| `/register` | Daftar email |
| `/onboarding` | Lengkapi profil (wajib sebelum `/chats`) |
| `/chats`, `/chats/:chatId` | Daftar chat + ruang chat |
| `/new-chat` | Cari user / mulai chat |
| `/settings` | Profil, privasi, amankan akun (anon→email), tema, logout |

Aturan gate:

- Ada sesi + profil lengkap → `/chats`.
- Ada sesi + profil belum lengkap → `/onboarding`.
- Tanpa sesi → `/login`.

### 5.1 Login anonim (guest)

1. User isi form di `/login` → `supabase.auth.signInAnonymously()`.
2. Insert profil (`is_registered=false`) via `registerProfile()`.
3. Masuk `/chats`.
4. Upgrade di `/settings` → "Amankan akun" → `supabase.auth.updateUser({ email, password })`
   lalu set `profiles.is_registered=true` (UID tetap, chat tidak hilang).

Catatan: bila `enable_confirmations=true`, email harus dikonfirmasi dulu
sebelum `is_registered` di-set.

---

## 6. Kontrak data dengan mobile

Lihat juga `chatyuk/INSTABOX.md` § "Sinkronisasi web ↔ mobile".

| Aspek | Kontrak |
|---|---|
| `chat_id` privat | dua uid di-sort lalu digabung `_` |
| Pesan | insert ke `private_messages`; field `text` (bukan `message`/`content`) |
| PK chat | `private_chats.chat_id` |
| PK profil | `profiles.id`; nama tampilan `profiles.nickname` |
| Trigger | `handle_new_private_message` mengisi `last_message`, `last_message_at`, `last_sender_id`, `message_count`, `unread_counts` |
| Realtime | `postgres_changes` pada `private_messages`, `private_chats`, `message_reactions`, `profiles` |
| Typing | channel broadcast `typing-<chatId>`, payload `{ sender_id, kind, ts }` |
| Read receipt | RPC `mark_chat_read(p_chat_id, p_uid)` |
| Hidden chat | `private_chats.hidden_by`; kirim pesan meng-unhide |
| Tampil di list | hanya `message_count > 0` |
| Reaksi | `message_reactions` dengan `chat_type='private'`, `message_id` string |
| Media | bucket `chat-photos`; path `chat/`, `voice/`, `avatars/`, `stickers/` |

### 6.1 Format media

| Tipe | Field | Catatan |
|---|---|---|
| image | `image_path` (+ `image_data`) | web kirim path storage |
| voice | `voice_path`, `duration_ms` | mobile menulis `voice/<chatId>/<stamp>.m4a` |
| video | `image_path` (.mp4), `video_poster`, `duration_ms` | web upload ke `chat/<chatId>/*.mp4` |
| file | `image_path` (`_f.<ext>`), `duration_ms` = ukuran byte | nama file di `text` |
| location | `text` = JSON `{lat,lng,label,caption,accuracyM}` | web render link Google Maps |
| poll | `poll` = `{q, o[], m}` | web hanya menampilkan (vote belum) |
| contact | `contact` = `{t:'user',u}` atau `{t:'phone',n,p[]}` | web tampilkan nomor/user |
| sticker | `image_path` `stickers/...` | web render gambar |
| gift/coin/call | `text` | web tampilkan teks |

---

## 7. Caddy (`deploy/Caddyfile`)

```caddy
:8080 {
	root * /data/workspace/chatyuk-web/dist
	encode zstd gzip

	@supabase path /rest/* /auth/* /storage/* /realtime/* /functions/* /graphql/* /pg/*
	handle @supabase {
		reverse_proxy 127.0.0.1:54321 { flush_interval -1 }
	}

	handle /runtime-config.js {
		header Cache-Control "no-store, max-age=0"
		file_server
	}

	handle /assets/* {
		header Cache-Control "public, max-age=31536000, immutable"
		file_server
	}

	handle {
		header Cache-Control "no-cache"
		try_files {path} /index.html
		file_server
	}
}
```

- HTML `no-cache` supaya deploy baru langsung terpakai (dulu sering tertahan
  cache browser).
- Asset ber-hash `immutable` 1 tahun.
- Config aktif di VM: `/data/workspace/chatyuk-web/deploy/Caddyfile`.
  Reload: `sudo /usr/local/bin/caddy reload --config <path> --adapter caddyfile`.

---

## 8. Perintah harian

```bash
# dev lokal (mesin sendiri)
cd ~/Documents/chatyuk-web && npm run dev      # http://127.0.0.1:5173

# kualitas kode
npm run lint        # oxlint
npm test            # vitest (42 test: nickname, chats, time, regions, utils)
npm run build       # tsc -b + vite build

# deploy ke VM
npm run build && \
ssh -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  ibssh_pkaewaqds244ilfseabkwddeeu@api.instabox.sh \
  'rm -rf /data/workspace/chatyuk-web/dist'
tar czf - dist | ssh -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  ibssh_pkaewaqds244ilfseabkwddeeu@api.instabox.sh \
  'tar xzf - -C /data/workspace/chatyuk-web'

# status backend
ssh ... 'cd /data/workspace/chatyuk/supabase && supabase status'
```

---

## 8b. Modularitas & keamanan (hasil audit 2026-10-21)

### Struktur setelah refactor

| Sebelum | Sesudah |
|---|---|
| `ChatPage.tsx` 1.096 baris (8 tanggung jawab) | **659 baris** — orkestrasi saja |
| scroll logic di dalam komponen | `hooks/useChatScroll.ts` |
| teks/reply/send/typing di komponen | `hooks/useChatComposer.ts` |
| image/file/video/voice/location di komponen | `hooks/useMediaSend.ts` |
| `regions.ts` 2.229 baris | **13 baris** + `regions.data.json` |
| 5 file `features/` impor `@/lib/supabase` | `lib/api/auth.ts` (0 kebocoran layer) |
| batas ukuran tersebar di 4 tempat | `lib/constants.ts` |

### Keamanan

| Item | Status |
|---|---|
| RLS `private_messages` (anon) | ✅ `[]` (diblokir) |
| Kolom sensitif `profiles` | ✅ 401 (column grant) |
| Insert pesan/profil anon | ✅ 401 `_anon_write_ok` |
| Upload storage anon | ✅ 403 |
| XSS sink (`innerHTML`/`eval`) | ✅ tidak ada |
| `target="_blank"` tanpa `rel` | ✅ tidak ada |
| Secret di source | ✅ tidak ada (publishable saja) |
| Bucket `chat-photos` MIME+size | ✅ 50 MB, 21 MIME (migration `20261021010000`) |
| `errorMessage()` bocor detail server | ✅ diperbaiki (generic + console) |

### Backlog keamanan

- **C3** Sesi di `localStorage` → pertimbangkan cookie httpOnly (ubah backend).
- **C4** Blokir hanya di klien → perlu trigger/policy server (lintas fitur).
- **C5** Media publik → lihat `MEDIA_PRIVACY_OPTIONS.md` (opsi Hybrid direkomendasikan).

## 8b2. Keamanan (hasil audit + perbaikan 2026-10-22)

### Yang ditegakkan di server (berlaku web & mobile)

| Item | Cara | Status |
|---|---|---|
| Blokir dua arah | trigger `enforce_chat_block` (BEFORE INSERT `private_messages`) | ✅ terpasang di DB lokal |
| Ubah `participants` chat | trigger `check_private_chat_update` + policy `WITH CHECK` | ✅ dua lapis |
| Akses pesan privat | RLS `private_messages_select` (peserta chat) | ✅ |
| Kolom sensitif profil | column-level grant | ✅ |
| Upload storage | `storage_object_owner_ok()` (fail-closed per path) | ✅ |
| Bucket | 50 MB + 21 MIME allowlist | ✅ |
| Anon insert | `_anon_write_ok` guard | ✅ |

### Yang diperkuat di sisi web (kode klien)

| Item | File | Keterangan |
|---|---|---|
| Allowlist URL media | `src/lib/url-safety.ts` | hanya `https:`, `blob:`, `data:image/audio`; tolak `javascript:`/`file:` |
| Sanitasi `tel:` | `src/lib/url-safety.ts` | hanya `+?digit{6,15}` |
| Validasi koordinat peta | `src/lib/url-safety.ts` | rentang bumi + bukan null |
| Validasi upload (magic bytes) | `src/lib/upload-validate.ts` | signature JPEG/PNG/GIF/WebP/PDF/MP4/ZIP; teks polos hanya bila ekstensi teks |
| Pesan error aman | `src/lib/errors.ts` | tidak pernah menampilkan pesan mentah server; kunci i18n |
| Laporan pengguna | `src/lib/api/reports.ts` | insert ke tabel `reports` (policy `reports_insert_own`), dialog di `ProfileDrawer` — paritas dengan Android |
| Grup (room privat) | `src/lib/api/groups.ts` | baca `messages` langsung (bukan `get_room_messages`); join gratis; poin via `coin_ledger` append-only |
| Gate pendaftaran | `src/lib/api/app-settings.ts` | `require_registration` dibaca dari `app_settings`; default `false` saat gagal |

### Header keamanan (Caddy)

```
Content-Security-Policy "default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https:; media-src 'self' blob: https:;
  connect-src 'self' https: wss:; font-src 'self' data: https://fonts.gstatic.com;
  frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"
X-Content-Type-Options "nosniff"
Referrer-Policy "no-referrer"
X-Frame-Options "DENY"
Permissions-Policy "geolocation=(self), microphone=(self), camera=(), payment=()"
Cross-Origin-Opener-Policy "same-origin"
```

- Domain-agnostic (`https:`/`wss:`) → **berjalan di ngrok lokal maupun domain produksi** tanpa edit.
- Tahap Report-Only sudah lewat: **0 pelanggaran** saat login, chat realtime, upload gambar, dan OAuth Google.
- `style-src 'unsafe-inline'` dibutuhkan Tailwind + style inline; `script-src 'self'` tetap ketat.

### Uji blokir (hasil)

| Skenario | Hasil |
|---|---|
| Tanpa blokir | ✅ insert sukses |
| B → A saat A memblokir B | ✅ `ERROR: blocked` |
| A → B saat A memblokir B (dua arah) | ✅ `ERROR: blocked` |
| Setelah unblock | ✅ insert sukses |
| Bypass via REST API langsung | ✅ `400 {"message":"blocked"}` |
| Web: banner + tombol kirim mati | ✅ tampil & disabled |
| Regresi: kirim normal web | ✅ terkirim |
| Update `private_chats` normal / pin | ✅ lolos (uji JWT asli via browser) |
| Update oleh non-peserta | ✅ 0 baris terpengaruh (policy `USING`) |

## 8c. Anti-idle / ketahanan server (instabox)

### Kenapa "server mati sendiri"

VM instabox bisa di-**stop/suspend oleh platform** saat dianggap idle
(lihat `/data/home/MACHINE.md`: *"A stop ends every process"*). Ini **bukan**
crash aplikasi: `uptime` tetap panjang, tidak ada OOM, `RestartCount` container = 0.
Yang terlihat "mati" adalah proses yang ikut berhenti saat sandbox di-suspend.

Bukti tambahan: log Caddy hanya berganti PID pada jam tertentu tanpa error
bind/koneksi — pola khas proses dihentikan dari luar.

### Yang dipasang (systemd, semua `enabled`)

| Unit | Fungsi |
|---|---|
| `chatyuk-keepalive.service` | denyut tiap 60 dtk: cek HTTP Caddy + `/auth/v1/health`, query ringan DB, restart service yang mati. `CPUQuota=5%`, `Nice=10` |
| `chatyuk-supabase.service` | `supabase start`/`stop` otomatis saat VM boot/shutdown (`oneshot`, idempotent) |
| `chatyuk-web.service` | Caddy `:8080`, `Restart=always` |
| `ngrok.service` | tunnel publik |
| `ngrok-watch.timer` | tiap 2 menit probe **URL publik** (`/auth/v1/health`); bila bukan 200 → `systemctl restart ngrok`. Menangkap kasus "proses hidup tapi tunnel mati" (ERR_NGROK_3200) |

Skrip pendukung:
- `/usr/local/bin/chatyuk-keepalive.sh` — loop keep-alive, log ke `/tmp/chatyuk-keepalive.log` (maks 2000 baris).
- `/usr/local/bin/chatyuk-status` — ringkasan status satu perintah.
- `/usr/local/bin/ngrok-watch` — probe publik + auto-restart ngrok, log ke `/tmp/ngrok-watch.log`.

### Cara cek

```bash
ssh -p 2222 ... 'chatyuk-status'
ssh -p 2222 ... 'tail -20 /tmp/chatyuk-keepalive.log'
```

Log keep-alive menampilkan `web=<kode> auth=<kode> load=<n>` per menit.

Cek kesehatan tunnel publik:

```bash
ssh -p 2222 ... 'tail -5 /tmp/ngrok-watch.log'
ssh -p 2222 ... 'systemctl list-timers ngrok-watch.timer --no-pager'
```

Baris `PUBLIC=200 ok` = tunnel sehat. Bila muncul `-> restart ngrok`, watchdog sudah mencoba memulihkan otomatis.

### Insiden: ERR_NGROK_3200 (2026-10-24)

Gejala: URL publik mengembalikan **HTTP 404 ERR_NGROK_3200 "endpoint offline"**, termasuk
`/auth/v1/authorize` → login Google gagal. Penyebab: proses `ngrok` **aktif** dan API
lokal `:4040` masih mendaftarkan tunnel, tetapi edge ngrok menganggap endpoint offline
(sesi basi) — sehingga `chatyuk-keepalive` (yang hanya mengecek lokal) tidak mendeteksi.

Perbaikan: `sudo systemctl restart ngrok`. Pencegahan permanen: `ngrok-watch.timer`
di atas, yang memeriksa **dari luar** (URL publik), bukan dari dalam VM.

### Batasan yang perlu diketahui

1. **Suspend tetap bisa terjadi** bila platform mengabaikan aktivitas ringan.
   Keep-alive menaikkan peluang tetap hidup, bukan jaminan absolut.
2. Untuk produksi: pakai selalu-aktif (bukan sandbox) atau `instabox-port`
   + monitoring eksternal.
3. `chatyuk-supabase.service` menjalankan `supabase start` saat boot; bila
   volume DB hilang, stack dibuat ulang **kosong** — karena itu backup rutin
   tetap wajib (lihat §9).

## 8d. Privasi media (C1) — status uji

Uji bucket percobaan `chat-photos-trial` (privat, 50 MB, 3 MIME) LULUS:
upload 200 · signed URL 200 · publik 400 · tanpa token 400.

Bucket uji + policy sementara **sudah dibuang** (0 bucket, 0 policy, 0 objek).
`chat-photos` **tetap `public = true`** — sesuai kesepakatan: trial dulu, lapor.

**Mitigasi sudah terpasang & teruji:** `SafeImage` (`src/components/ui/safe-image.tsx`)
dan `Avatar` otomatis beralih ke **signed URL** bila URL publik ditolak.

Uji simulasi (bucket `chat-photos` di-set `public=false` sementara):
- Tanpa cache → URL publik 400 → gambar **berhasil** dirender via signed URL ✅
- Bucket dikembalikan `public=true` → perilaku normal kembali ✅
- **Android aman**: mobile tidak memakai `getPublicUrl` sama sekali; semua
  media diambil via `storage.download(path)` ber-JWT (terverifikasi di
  `storage_photo_service.dart`, `avatar_service.dart`, `message_image.dart`,
  `view_once_image.dart`, `story_service.dart`, `room_icon.dart`).

Artinya: bucket boleh dijadikan privat **kapan pun** tanpa merusak web
(otomatis signed URL) maupun Android. Kode tambahan: `src/lib/media-signed.ts`.

**Status: bucket `chat-photos` SUDAH privat (`public=false`).** Web memakai
`SafeImage`/`Avatar` yang otomatis signed URL. Mode privat diingat di
`localStorage('chatyuk-media-private')` (`src/lib/media-mode.ts`) supaya
media berikutnya langsung signed — tidak ada lagi 400 berulang di console.
Terverifikasi: gambar tampil (naturalWidth 120) via `token=...`, 0 error console.

## 9. Backup & pemulihan DB lokal

**Wajib sebelum `supabase stop`.** Percobaan `stop --no-backup` + `start`
pernah membuat volume `supabase_db_ChatYuk` dibuat ulang → seluruh auth user,
chat, pesan, dan storage hilang (insiden 2026-10-20).

```bash
ssh ... 'mkdir -p /data/workspace/backups && \
  docker exec supabase_db_ChatYuk pg_dump -U postgres -d postgres -Fc \
  > /data/workspace/backups/$(date +%s).dump'

# restore
ssh ... 'docker exec -i supabase_db_ChatYuk pg_restore -U postgres -d postgres \
  --clean --if-exists < /data/workspace/backups/<file>.dump'
```

Backup terakhir: `/data/workspace/backups/pre-google-dev-1792540007.dump` (1.9 MB).

---

## 10. Aturan test (dari `chatyuk/AGENTS.md`)

- **Dilarang** memakai identitas user asli sebagai `sender_id` untuk pesan uji.
- Test chat wajib dari **akun dummy** (`dummy_accounts.uid`) dengan awalan
  `[TEST]`, lalu bersihkan `private_messages`, `private_chats.last_message`,
  dan log AI.
- Jangan menyentuh project cloud `fohcucyyejdryryoxitm` tanpa izin.

---

## 11. Drift / catatan lokal

| Item | Status |
|---|---|
| `site_url` | masih `http://127.0.0.1:3000`; redirect web ditangani `additional_redirect_urls` |
| Edge functions | secret lokal kosong → AI/payment/email/push tidak jalan |
| Cron lokal | masih menunjuk URL cloud (lihat INSTABOX.md) |
| Client produksi Web | **tidak** dipakai lagi di config lokal |
| Ngrok free | interstitial sekali per browser; API pakai header `ngrok-skip-browser-warning` |
| Lint | `oxlint`: **12 warning, 0 error**. Sisanya pola React Compiler `set-state-in-effect` di `SettingsPage` (4), `useOutboxFlush` (1), `useChatComposer` (1), `useChatScroll` (1), `useChatRealtime` (1), `ViewOnceCard` (1). Sengaja dibiarkan: semuanya reset/sinkronisasi state yang memang harus terjadi setelah render (draft chat, privacy form, antrean outbox); memaksakan pola lain berisiko mengubah perilaku. Warning lain (fast-refresh, impure render, unsafe optional chaining) sudah diperbaiki. |

---

## 12. Riwayat perubahan penting

| Tanggal | Perubahan |
|---|---|
| 2026-10-20 | Web SPA + Caddy + ngrok; chat 1:1 realtime dua arah |
| 2026-10-20 | Google lokal diaktifkan (client produksi + secret dummy) untuk ID token |
| 2026-10-21 | Halaman awal ala Android (form profil + Google + email) |
| 2026-10-21 | Login anonim, upgrade anon→email, gender/negara/kota dari mobile |
| 2026-10-21 | Block user (enforce + UI), media tampil & kirim (file/video/voice/lokasi) |
| 2026-10-21 | OAuth client dev `ChatYuk Web Dev (ngrok)` — Google login web berhasil |
| 2026-10-21 | Cache header Caddy (HTML no-cache, asset immutable) |
| 2026-10-21 | Unit test Vitest (42) mencerminkan test Android |
| 2026-10-22 | Laporan pengguna (report) — paritas Android; pesan error aman (i18n) |
| 2026-10-22 | Policy `private_chats_update` + `WITH CHECK` (lapis kedua di samping trigger) |
| 2026-10-22 | Keamanan: sanitasi URL, magic bytes upload, CSP enforce, header keamanan |
| 2026-10-22 | Uji media privat (bucket percobaan) LULUS; penerapan penuh ditunda |
| 2026-10-22 | Gate `require_registration` di web: tombol tamu dinonaktifkan bila aktif. Android tidak disentuh |
| 2026-10-23 | Grup di web: list, explore, join, chat teks, realtime. Join server GRATIS (jangan tampilkan `join_paid`) |
| 2026-10-23 | FEATURE_PARITY.md: peta gap fitur mobile vs web + urutan eksekusi disetujui |
| 2026-10-23 | FEATURE_PARITY.md v2: + bagian 7 Paritas UI (token, tipografi, per layar). Diterapkan cepat: --online #4CAF50, --danger #F44336, reaksi +😁 |
| 2026-10-24 | Insiden ERR_NGROK_3200 (tunnel basi): restart ngrok + pasang `ngrok-watch.timer` (probe publik tiap 2 menit, auto-restart) |
| 2026-10-22 | Fallback media: web auto signed URL saat URL publik ditolak (uji bucket privat PASS). Android tidak memakai URL publik — aman |
| 2026-10-21 | Perbaikan `presence_for`: `invisible_admin_uid` text kosong → cast uuid gagal (POST 400 di `/rest/v1/rpc/presence_for`). Fungsi live di-replace dari `20261020150000_fix_presence_for_invisible_uid.sql` |
| 2026-10-21 | Perbaikan `auth.users` seed: kolom token NULL → GoTrue admin API 500 `converting NULL to string` |
| 2026-10-21 | Fixture test akun dummy (DummyAlpha/DummyBeta) + chat `[TEST]` |
| 2026-10-21 | Refactor modular: pecah ChatPage → 3 hook, `lib/api/auth.ts`, `lib/constants.ts`, `regions.data.json` |
| 2026-10-21 | Keamanan: bucket MIME+size limit (C1), `errorMessage` tanpa bocor detail (C2) |
| 2026-10-21 | Anti-idle: `chatyuk-keepalive.service` + `chatyuk-supabase.service` + `chatyuk-status` |
