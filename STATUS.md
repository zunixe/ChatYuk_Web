# Status Akhir — ChatYuk Web vs Mobile

Rangkuman kondisi terkini hasil pekerjaan bertahap (bukan perkiraan).
Diperbarui: 2026-10-24. Dokumen rinci: `FEATURE_PARITY.md`, `GROUPS.md`, `WEB_CONFIG.md`, `MEDIA_PRIVACY_OPTIONS.md`.

---

## 1. Angka kunci

| Metrik | Nilai |
|---|---|
| Item paritas selesai | **30 / 33** ✅ |
| Sisa (butuh keputusan/infrastruktur) | 3 (B11, C7, C10) |
| Test | **97 passing / 15 file** |
| Lint (`oxlint`) | 12 warning, **0 error** (baseline lama) |
| Typecheck | bersih (`tsc --noEmit`) |
| Modul fitur web | 11 (`auth, chat, chats, contact, donate, groups, nearby, points, settings, stories, timeline`) |
| Route web | 17 |
| File TS/TSX | 138 |
| Commit di `main` | 53 |
| Layar mobile (referensi) | 61 total, 42 non-admin |

Status layanan saat dokumen ini dibuat: `https://defense-subtract-untrimmed.ngrok-free.dev` → `/` = **200**, `/auth/v1/health` = **200**.

---

## 2. Yang sudah setara (per kategori)

### Auth & onboarding — 100%
Login email, Google OAuth (client dev terpisah), anonymous + **link email** (terverifikasi: UID tetap, `is_anonymous=false`, `is_registered=true`), registrasi (nickname/gender/umur/negara/kota), **reset password** (`/reset-password`, dua keadaan: minta tautan / set password baru), gate `require_registration` dari `app_settings`.

### Chat private — ~97%
Teks, gambar, **album** (`album_id`, maks 10, satu bubble grid), voice (m4a agar terbaca HP), video, file, lokasi, **lokasi LIVE** (durasi 15 mnt/1 jam/8 jam, refresh 30 dtk, badge LIVE + countdown), sticker (render + **picker kirim**), poll (render + vote), contact, gift, **video sekali-lihat** (kirim + siklus `video_once` → `video_once_expired`), reply, reaksi, edit, hapus (soft) + retry + **undo**, typing, read receipt, pin, mute, **arsip** (`archived_by`), **bintang pesan** (`starred_messages`), blokir 2 arah + lapor, **mention `@nama`** (autocomplete + jsonb + highlight), **forward** (chat & grup), offline outbox.

### Grup / room privat — 100% (fase 1–10)
Buat grup (300/450 poin, dipotong **server**), list, explore, join (gratis di server), chat teks, **media grup**, **poll**, **lokasi live**, **galeri media**, **kode gabung**, dan panel **Info grup**: anggota, kick, jadikan admin, undang, **approve/reject** permintaan bergabung, ganti ikon, atur/hapus password, perpanjang, hapus, keluar.

### Interaksi & sosial — 100% (kecuali C4/C7/C10 di bawah)
**Stories** (tray, viewer auto-advance, like, tandai ditonton, komposer + visibilitas), **Timeline** (feed scope Untukmu/Diikuti/Milikku, like, komentar + balasan, share, hapus), **Leaderboard** poin (mingguan/all-time), **Riwayat poin** (`coin_ledger`), **Donate** (QRIS + 4 jaringan USDT dengan alamat identik Android), **Kontak** (form pesan) & **permintaan teman** (inbox terima/tolak, outbox batalkan), **Nearby** (dengan pagar privasi).

### Settings & keamanan
Profil, 7 field privasi, tema, bahasa EN/ID, ganti password, hapus akun, ganti password via sesi recovery. Keamanan: CSP + security headers, validasi magic-bytes upload, allowlist URL, blokir ditegakkan trigger server, RLS diverifikasi untuk pesan room/story/friend-request, media privat dengan **signed-URL fallback** otomatis (dan mode privat diingat agar console bersih).

### Operasional server
Supabase lokal + Caddy + ngrok; `chatyuk-keepalive`, `chatyuk-supabase`, **`ngrok-watch.timer`** (probe URL **publik** tiap 2 menit, auto-restart bila bukan 200).

---

## 3. Sisa pekerjaan (butuh keputusan, bukan karena terlewat)

| Kode | Item | Kenapa berhenti di sini |
|---|---|---|
| **B11** | Notifikasi browser | Mekanisme beda dari FCM: butuh VAPID + Service Worker + izin. Perlu desain & uji terpisah (fase sendiri). |

| **C7** | Top up / subscribe | Menyentuh **uang nyata**; butuh payment gateway, keputusan bisnis, dan kepatuhan. Jangan diimplementasikan tanpa keputusan eksplisit. |
| **C10** | Panggilan (voice/video) | WebRTC: butuh signaling + **TURN/STUN** dan uji lintas perangkat nyata. Bukan pekerjaan satu iterasi. |

Catatan tambahan: **admin panel** (20+ layar Android) sengaja **tidak** dipindah ke app publik — sebaiknya web admin terpisah dengan auth khusus.

---

## 4. Jebakan kontrak yang ditemukan (jangan diulang)

1. **Pesan grup ≠ pesan private** — grup pakai tabel `messages` (kolom `room_id`), private pakai `private_messages` (kolom `chat_id`).
2. **`get_room_messages` khusus admin** — anggota membaca langsung tabel `messages`; jangan "memperbaiki" dengan membuka permission.
3. **Join grup privat gratis**, tetapi **buat grup berbayar** (`create_paid × multiplier`). `room_pricing().join_paid = 5` tidak dipakai lagi.
4. **Poin = `coin_ledger`** (append-only, trigger `coin_ledger_no_mutate`); `profiles.points` hanya cermin `wallet_sync_points`. Jangan `UPDATE profiles.points` untuk uji — pakai entri ledger (positif lalu negatif) agar netto 0.
5. **`is_admin_request()` fail-closed** — JWT uji tanpa klaim `email` akan kena "Not authorized".
6. **Path storage grup wajib `room_<roomId>`** (`chat/room_<id>/…`), bukan `chat/<roomId>/…` → salah path = upload **400** diam-diam.
7. **`update_my_location` hanya menerima `p_source` = `gps` | `ip`**; nilai lain → `Invalid source`.
8. **`story_slides` urut TERLAMA → TERBARU** (bukan terbaru dulu) — tervalidasi dari komentar Android.
9. **RPC leaderboard memakai field `score`**, bukan `points`/`total`.
10. **`video_poster` NOT NULL dengan default `''`** — jangan kirim `null`.
11. **Key i18n bisa bentrok** (`contact.title` sudah dipakai ProfileDrawer) — pakai prefix baru (`kontak.*`).
12. **`tsc -b` (incremental) bisa melewatkan error urutan deklarasi** — gate wajib pakai `tsc --noEmit` + `npm run build`.

---

## 5. Insiden operasional (sudah pulih, sudah didokumentasikan)

| Insiden | Penyebab | Tindakan |
|---|---|---|
| `ERR_NGROK_3200` (login Google gagal) | Proses ngrok hidup tetapi sesi edge basi; keep-alive hanya cek lokal | Restart + pasang `ngrok-watch.timer` yang memprobe URL **publik** |
| `rm -rf` tak sengaja menghapus `/data/workspace/chatyuk-web` | Perintah pembersihan berantai dengan `..` | Pulihkan `deploy/` dari repo (diverifikasi `diff` identik) + `dist/` dari artefak build; aturan baru: larangan `rm -rf` relatif/berantai |

---

## 6. Cara menjalankan & memverifikasi

```bash
cd ~/Documents/chatyuk-web
npm test          # 97 test
npx tsc --noEmit  # typecheck
npx oxlint        # 12 warning, 0 error
npm run build     # gate terakhir sebelum deploy
```

Deploy: kirim `dist` ke VM lalu ekstrak ke `/data/workspace/chatyuk-web/dist` (Caddy menyajikan folder itu).
Cek kesehatan: `curl -o /dev/null -w '%{http_code}' https://defense-subtract-untrimmed.ngrok-free.dev/` dan `…/auth/v1/health`; log watchdog `tail -5 /tmp/ngrok-watch.log`.

---

## 7. Rekomendasi urutan berikutnya

1. **B11 notifikasi browser** — fase tersendiri; mulai dari desain izin + Service Worker, lalu uji di perangkat.
2. **C10 panggilan** — hanya jika ada kebutuhan produk jelas dan infrastruktur TURN siap.
3. **C7 top-up** — tunggu keputusan bisnis/payment.

Selain itu, sisa pekerjaan yang bernilai: uji visual lintas perangkat (Android ↔ web) yang selama ini **belum bisa diverifikasi otomatis** karena `uiautomator` tidak menangkap UI aplikasi dengan benar.
