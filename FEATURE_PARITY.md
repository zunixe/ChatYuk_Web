# Paritas Fitur ChatYuk Mobile vs Web

Dokumen hasil perbandingan langsung kode sumber (bukan asumsi):
- Mobile: `~/Documents/chatyuk` — 61 layar (`lib/screens/`), 40+ service (`lib/services/`)
- Web: `~/Documents/chatyuk-web` — modul `src/features/{auth,chat,chats,groups,settings}`

Update terakhir: 2026-10-23.

---

## 1. Ringkasan eksekutif

| Kategori | Paritas | Catatan |
|---|---|---|
| Auth & onboarding | 🟢 ~95% | Kurang: reset password, link email |
| Chat private (teks & media) | 🟡 ~80% | Kurang: album, forward, live location, sticker picker, pin/starred pesan |
| Manajemen chat (pin/mute/hide) | 🟡 ~85% | Kurang: arsip chat (UI) |
| Grup / room privat | 🔴 ~35% | Fase 1 baru selesai (list, join, chat teks) |
| Stories / Timeline | 🔴 0% | Tidak ada sama sekali di web |
| Panggilan | 🔴 0% | Tidak ada di web |
| Modul sosial (nearby, leaderboard, posts, dll) | 🔴 0% | Tidak ada di web |
| Notifikasi | 🔴 ~10% | Web tidak punya push sama sekali |
| Keamanan & privasi | 🟢 ~90% | Blokir, lapor, RLS, CSP, signed-URL fallback sudah jalan |

Legenda: 🟢 ≥ 80% · 🟡 40–79% · 🔴 < 40%

---

## 2. Yang sudah apple-to-apple

### Auth
- Login email/password, Google OAuth (client dev terpisah, sudah teruji)
- Login anonymous + upgrade akun
- Registrasi: nickname, gender, umur, negara, kota (validasi sama: `isBannedNickname`, `isValidNickname`)
- Gate `require_registration` dibaca dari `app_settings` (default aman `false`)
- Bahasa EN (default) / ID

### Chat private
- Tipe pesan yang **kirim + render**: `text`, `image`, `voice`, `video`, `file`, `location`
- Tipe pesan yang **render saja**: `sticker`, `poll`, `contact`, `gift`/`coin`, `view_once`, `video_once`
- Reply (dengan snapshot pengirim/teks), reaksi emoji, edit pesan, hapus pesan (soft delete `is_deleted`, undo)
- Typing indicator (broadcast `typing-<chatId>`), read receipt (`mark_chat_read`)
- Pin chat, mute chat, hide chat (`hidden_by`), chat ID `sorted(uidA_uidB)`
- Blokir 2 arah: UI + trigger server `enforce_chat_block` (API bypass ditolak 400)
- Lapor pengguna (tabel `reports`, dialog sama seperti Android)
- Offline outbox (Dexie) + banner + flush manual
- Realtime: `profiles`, `private_chats`, `private_messages`, `message_reactions`

### Grup fase 1 (baru selesai)
- `/groups`: tab Grup saya + Explore, pencarian
- Join (server **gratis** — jangan tampilkan `join_paid`), termasuk grup ber-password
- Room chat teks + realtime INSERT + mark read
- Baca pesan via select langsung tabel `messages` (`get_room_messages` khusus admin)

### Settings
- Profil: nickname, gender, avatar, umur, negara, kota, bio
- Privasi: 7 field (`profile_privacy_exclusions`) dengan people picker
- Tema terang/gelap, hapus akun

### Keamanan
- CSP + security headers di Caddy, magic-byte upload validation, allowlist URL
- Media: fallback otomatis ke signed URL saat URL publik ditolak (bucket `chat-photos` bisa diprivat kapan pun; Android aman karena pakai `storage.download()` ber-JWT)

---

## 3. Gap: harus disamakan

Prioritas: **P0** = dipakai harian, pengguna langsung merasakan · **P1** = penting · **P2** = bisa menunggu.

### A. Lengkapi grup dulu (lanjutan fase 1) — prioritas urutan #1

| # | Fitur | Kontrak mobile | P | Estimasi kerja |
|---|---|---|---|---|
| A1 | Buat grup dari web | `rpc('create_private_room', {p_name, p_icon, p_country, p_password?, p_category?})` — biaya `create_paid × multiplier` (300 / 450 dengan password), dipotong **server**. Validasi nama 3–30 karakter, limit 2 grup aktif, cegah duplikat (return `duplicate: true` + `join_token`) | P0 | Sedang: form + dialog konfirmasi biaya + tampilkan `join_token` |
| A2 | Kelola anggota | `rpc('kick_room_member')`, `rpc('invite_to_room')`, `rpc('list_room_members_v2')`, `fn_room_role()` untuk cek role owner/admin | P0 | Sedang: sheet anggota + aksi per baris |
| A3 | Approve join request | `rpc('list_room_join_requests')` + update status `approved`/`rejected` (mobile: `PrivateRoomService.approveJoin`) | P0 | Kecil |
| A4 | Info grup + edit | `rooms` (name, description, icon, password) + `rpc('update_room_icon')`, `rpc('reset_room_password')`, hapus password | P1 | Sedang |
| A5 | Extend & hapus grup | `rpc('extend_private_room')` (50 × mult), `rpc('delete_private_room')` | P1 | Kecil |
| A6 | Media di grup | Tabel `messages` kolom sama (`image_path`, `voice_path`, `duration_ms`, `video_poster`) — kontrak sudah sama dengan private, tinggal wire ke `useMediaSend` | P1 | Sedang |
| A7 | Poll di grup | `messages.poll` (jsonb) + `rpc('vote_room_poll')`, `rpc('get_room_poll_results')` | P1 | Kecil (PollCard sudah ada) |
| A8 | Live location di room | `messages` type `location` + update `text` berkala (mobile: `updateLocationMessage`) | P2 | Sedang |
| A9 | Group media screen | Galeri media room (mobile: `group_media_screen.dart`) | P2 | Sedang |
| A10 | QR / join token | `rooms.join_token` — mobile scan QR (P2, web bisa pakai link `?token=`) | P2 | Kecil |

### B. Fitur chat private yang hilang — prioritas urutan #2

| # | Fitur | Kontrak mobile | P | Estimasi kerja |
|---|---|---|---|---|
| B1 | Album (multi-foto) | `messages.album_id` (uuid) — kirim banyak image sekaligus, render berderet | P0 | Sedang: upload loop + render album |
| B2 | Forward pesan | `messages.is_forwarded` + dialog pilih tujuan (chat/grup) | P0 | Kecil–sedang |
| B3 | Sticker picker (kirim) | Mobile kirim via `image_data` path storage sticker; web baru bisa **render**, belum kirim | P0 | Kecil: picker grid + insert |
| B4 | Pin pesan | `starred_messages` tabel + `message_reaction_service.dart` L216-247 (pin ≠ star di mobile; cek ulang keduanya) | P1 | Kecil–sedang |
| B5 | Starred messages UI | Tabel `starred_messages` — daftar pesan dibintangi | P1 | Sedang |
| B6 | Live location (private) | `private_messages` type `location` + update berkala + timer berakhir | P1 | Sedang |
| B7 | Arsip chat (UI) | `private_chats.archived_by` — kolom sudah terbaca web (types), belum ada toggle/list arsip | P1 | Kecil |
| B8 | Reset password | Mobile: `reset_password_screen.dart` — Supabase `resetPasswordForEmail` | P0 | Kecil |
| B9 | Link email ke akun anon | Mobile: `link_email_screen.dart` — `updateUser({email})` | P1 | Kecil |
| B10 | View-once video | `video_once` / `video_once_expired` + `duration_ms` (web sudah render kartu, pastikan expiry timer sama) | P1 | Kecil |
| B11 | Notifikasi browser | Mobile pakai FCM (`push_topic_service`, `notification_prefs`). Web: Notification API + Service Worker — mekanisme beda, perlu desain terpisah | P1 | Besar (fase sendiri) |
| B12 | Unsend/undo hapus | Mobile punya snackbar UNDO (`is_deleted=false`); web sudah hapus soft, tinggal UI undo | P2 | Kecil |
| B13 | Kutip/mention | `messages.mentions` (jsonb) — parse & highlight @nama | P2 | Sedang |

### C. Modul sosial — prioritas urutan #3 (fase besar, pecah bertahap)

| # | Fitur | Kontrak mobile | P | Estimasi kerja |
|---|---|---|---|---|
| C1 | Stories: viewer | Tabel `stories`, `story_views`, `story_likes`, `story_mutes` | P1 | Besar |
| C2 | Stories: composer | Upload foto/video + teks (`story_composer_screen`) — web bisa pakai input file biasa | P1 | Sedang |
| C3 | Timeline posts | Tabel `posts`, `post_likes`, `post_comments`, `post_shares` (`timeline_screen`, `post_detail_screen`) | P2 | Besar |
| C4 | Nearby | `user_location_history` + geo (`nearby_screen`) — sensitif privasi, perlu keputusan | P2 | Sedang |
| C5 | Leaderboard | `rpc('points_leaderboard')` | P2 | Kecil |
| C6 | Point history | `point_events` (`point_history_screen`) | P2 | Kecil |
| C7 | Top up / subscribe | `topup_orders`, `subscriptions` — butuh payment gateway, jangan sentuh tanpa keputusan | ⛔ | Tunda |
| C8 | Donate | `donate_screen` | P2 | Kecil |
| C9 | Kontak & friend requests | `contact_service`, `friend_requests_screen`, `device_contacts_service` — device contacts butuh izin & pertimbangan privasi | P2 | Sedang |
| C10 | Panggilan | `call_service`, `call_session_*` (WebRTC) — sangat besar; butuh signaling + TURN + uji lintas platform | ⛔ | Fase tersendiri |

---

## 4. Yang sengaja TIDAK disamakan (dengan alasan)

| Item | Alasan |
|---|---|
| Admin panel (20+ layar) | Alat internal khusus Android; kalau perlu, buat web admin terpisah dengan auth khusus, bukan bagian app publik |
| Device contacts sync | Akses kontak = risiko privasi besar + izin OS; di web sertifikat/izin browser lebih ketat. Tunda sampai ada keputusan produk |
| FCM push | Mekanisme web beda (Notification API + Service Worker + VAPID). Desain terpisah, bukan port langsung |
| Call/voice room WebRTC | Butuh TURN/STUN infra + uji lintas platform dengan perangkat nyata. Jangan masuk sampai grup & chat matang |
| Top up / payment | Menyentuh uang nyata; butuh keputusan gateway & compliance |
| `get_room_messages` RPC | Memang admin-only (`permission denied` untuk `authenticated`). Web wajib pakai select langsung `messages` — jangan "perbaiki" dengan membuka permission |

---

## 5. Jebakan kontrak (penting saat eksekusi)

Ditemukan saat riset & uji — catat agar tidak diulang:

1. **Pesan grup ≠ pesan private.** Grup pakai tabel `messages` (kolom `room_id`), private pakai `private_messages` (kolom `chat_id`). Jangan tertukar.
2. **`get_room_messages` admin-only.** Anggota membaca via select langsung `messages`; policy `messages_select` yang menjaga.
3. **Join grup privat GRATIS** di server (jalur auto-join, komentar "bukan mode koin"), meski `room_pricing().join_paid = 5` masih terisi. Jangan tampilkan biaya join. **Buat grup tetap berbayar** (`create_paid × multiplier`).
4. **Poin = ledger `coin_ledger` (append-only, trigger `coin_ledger_no_mutate`)**, bukan `profiles.points`. Urutan pemakaian: `bonus` → `topup` → `earned`. `profiles.points` hanya cermin dari `wallet_sync_points(uid)`. Untuk uji saldo, jangan `update profiles.points` — pakai `insert coin_ledger` lalu sync.
5. **`is_admin_request()` fail-closed.** JWT tanpa klaim `email` akan ditolak ("Not authorized") walau `sub` benar. Saat menguji SQL manual, selalu sertakan `email` di klaim.
6. **Room id privat berpola `pr_<hex>`**; global room `Indonesia_<slug>`. Jangan hardcode pola — selalu pakai `is_private`.
7. **Buat grup return `{id, points, join_token, duplicate?}`** — tangani `duplicate: true` dengan membuka grup lama, bukan error.

---

## 6. Urutan eksekusi yang disetujui

1. **Fase G — lengkapi grup**: A1 buat grup → A2 kelola anggota → A3 approve → A6 media grup → A4/A5 info/extend/hapus → A7 poll.
2. **Fase C — fitur chat yang hilang**: B8 reset password → B3 sticker picker → B2 forward → B1 album → B7 arsip → B4/B5 pin/star → B6 live location → B11 notifikasi (fase sendiri).
3. **Fase S — modul sosial**: C1/C2 stories → C5/C6 leaderboard & point history (cepat) → C3 timeline → sisanya sesuai kebutuhan.

Setiap fase: uji E2E (web kirim ↔ Android terima dan sebaliknya), `npm test` + `tsc` + `oxlint` hijau, deploy, commit + push, lalu update dokumen ini (tandai ✅ di tabel).
