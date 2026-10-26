# Paritas Fitur ChatYuk Mobile vs Web

Dokumen hasil perbandingan langsung kode sumber (bukan asumsi):
- Mobile: `~/Documents/chatyuk` — 61 layar (`lib/screens/`), 40+ service (`lib/services/`)
- Web: `~/Documents/chatyuk-web` — modul `src/features/{auth,chat,chats,groups,settings}`

Update terakhir: 2026-10-23 (v2: + bagian 7 Paritas UI).

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
| A1 ✅ | Buat grup dari web | `rpc('create_private_room', {p_name, p_icon, p_country, p_password?, p_category?})` — biaya `create_paid × multiplier` (300 / 450 dengan password), dipotong **server**. Validasi nama 3–30 karakter, limit 2 grup aktif, cegah duplikat (return `duplicate: true` + `join_token`) | P0 | Sedang: form + dialog konfirmasi biaya + tampilkan `join_token` |
| A2 ✅ | Kelola anggota | `rpc('kick_room_member')`, `rpc('invite_to_room')`, `rpc('list_room_members_v2')`, `fn_room_role()` untuk cek role owner/admin | P0 | Sedang: sheet anggota + aksi per baris |
| A3 ✅ | Approve join request | `rpc('list_room_join_requests')` + update status `approved`/`rejected` (mobile: `PrivateRoomService.approveJoin`) | P0 | Kecil |
| A4 ✅ | Info grup + edit | `rooms` (name, description, icon, password) + `rpc('update_room_icon')`, `rpc('reset_room_password')`, hapus password | P1 | Sedang |
| A5 ✅ | Extend & hapus grup | `rpc('extend_private_room')` (50 × mult), `rpc('delete_private_room')` | P1 | Kecil |
| A6 ✅ | Media di grup | Tabel `messages` kolom sama (`image_path`, `voice_path`, `duration_ms`, `video_poster`) — kontrak sudah sama dengan private, tinggal wire ke `useMediaSend` | P1 | Sedang |
| A7 ✅ | Poll di grup | `messages.poll` (jsonb) + `rpc('vote_room_poll')`, `rpc('get_room_poll_results')` | P1 | Kecil (PollCard sudah ada) |
| A8 ✅ | Live location di room | `messages` type `location` + update `text` berkala (mobile: `updateLocationMessage`) | P2 | Sedang |
| A9 ✅ | Group media screen | Galeri media room (mobile: `group_media_screen.dart`) | P2 | Sedang |
| A10 ✅ | QR / join token | `rooms.join_token` — mobile scan QR (P2, web bisa pakai link `?token=`) | P2 | Kecil |

### B. Fitur chat private yang hilang — prioritas urutan #2

| # | Fitur | Kontrak mobile | P | Estimasi kerja |
|---|---|---|---|---|
| B1 ✅ | Album (multi-foto) | `messages.album_id` (uuid) — kirim banyak image sekaligus, render berderet | P0 | Sedang: upload loop + render album |
| B2 ✅ | Forward pesan | `messages.is_forwarded` + dialog pilih tujuan (chat/grup) | P0 | Kecil–sedang |
| B3 ✅ | Sticker picker (kirim) | Mobile kirim via `image_data` path storage sticker; web baru bisa **render**, belum kirim | P0 | Kecil: picker grid + insert |
| B4 ✅ | Bintang pesan (star) — Android memakai seleksi multi-pesan, web memakai tombol per bubble | `starred_messages` tabel + `message_reaction_service.dart` L216-247 (pin ≠ star di mobile; cek ulang keduanya) | P1 | Kecil–sedang |
| B5 ✅ | Indikator bintang per pesan (daftar bintang belum ada di Android) | Tabel `starred_messages` — daftar pesan dibintangi | P1 | Sedang |
| B6 ✅ | Live location (private) | `private_messages` type `location` + update berkala + timer berakhir | P1 | Sedang |
| B7 ✅ | Arsip chat (UI) | `private_chats.archived_by` — kolom sudah terbaca web (types), belum ada toggle/list arsip | P1 | Kecil |
| B8 ✅ | Reset password | Mobile: `reset_password_screen.dart` — Supabase `resetPasswordForEmail` | P0 | Kecil |
| B9 ✅ | Link email ke akun anon (sudah ada di Settings; terverifikasi E2E) | Mobile: `link_email_screen.dart` — `updateUser({email})` | P1 | Kecil |
| B10 ✅ | View-once video (kirim + siklus expire terverifikasi) | `video_once` / `video_once_expired` + `duration_ms` (web sudah render kartu, pastikan expiry timer sama) | P1 | Kecil |
| B11 | Notifikasi browser | Mobile pakai FCM (`push_topic_service`, `notification_prefs`). Web: Notification API + Service Worker — mekanisme beda, perlu desain terpisah | P1 | Besar (fase sendiri) |
| B12 ✅ | Unsend/undo hapus (toast Undo, `is_deleted=false`) | Mobile punya snackbar UNDO (`is_deleted=false`); web sudah hapus soft, tinggal UI undo | P2 | Kecil |
| B13 ✅ | Mention `@nama` (autocomplete + jsonb + highlight) | `messages.mentions` (jsonb) — parse & highlight @nama | P2 | Sedang |

### C. Modul sosial — prioritas urutan #3 (fase besar, pecah bertahap)

| # | Fitur | Kontrak mobile | P | Estimasi kerja |
|---|---|---|---|---|
| C1 ✅ | Stories: tray + viewer (auto-advance, like, mark-seen) | Tabel `stories`, `story_views`, `story_likes`, `story_mutes` | P1 | Besar |
| C2 ✅ | Stories: composer (1 foto/video, caption, visibilitas) | Upload foto/video + teks (`story_composer_screen`) — web bisa pakai input file biasa | P1 | Sedang |
| C3 ✅ | Timeline posts (feed, like, komentar, share, hapus) | Tabel `posts`, `post_likes`, `post_comments`, `post_shares` (`timeline_screen`, `post_detail_screen`) | P2 | Besar |
| C4 ✅ | Nearby (RPC nearby_users; hanya jarak, wajib persetujuan, bisa dimatikan) | `user_location_history` + geo (`nearby_screen`) — sensitif privasi, perlu keputusan | P2 | Sedang |
| C5 ✅ | Leaderboard poin (weekly/alltime, RPC points_leaderboard) | `rpc('points_leaderboard')` | P2 | Kecil |
| C6 ✅ | Riwayat poin (coin_ledger, bucket/type/amount) | `point_events` (`point_history_screen`) | P2 | Kecil |
| C7 | Top up / subscribe | `topup_orders`, `subscriptions` — butuh payment gateway, jangan sentuh tanpa keputusan | ⛔ | Tunda |
| C8 ✅ | Donate (QRIS + 4 jaringan USDT, salin alamat) | `donate_screen` | P2 | Kecil |
| C9 ✅ | Kontak (pesan) & friend requests (inbox/outbox, terima/tolak/batal) | `contact_service`, `friend_requests_screen`, `device_contacts_service` — device contacts butuh izin & pertimbangan privasi | P2 | Sedang |
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

---

## 7. Paritas UI (bukan hanya fitur)

Fitur bisa sama tetapi terasa berbeda bila tampilannya beda. Bagian ini membandingkan **sumber kebenaran visual mobile** (`lib/config/theme.dart`) dengan web (`src/index.css`), lalu mendata gap UI per layar.

### 7.1 Design token — sudah sama ✅

| Token | Mobile (`AppTheme`) | Web (`--*`) | Status |
|---|---|---|---|
| Primary | `#2196F3` | `--primary: #2196f3` (dark `#4aa8ff`) | ✅ sama |
| Primary dark | `#1976D2` | `--primary-strong: #1976d2` | ✅ sama |
| Accent | `#00BCD4` | `--accent: #00bcd4` (dark `#2dd4e6`) | ✅ sama |
| Online | `#4CAF50` | `--online: #1f9d6b` | 🟡 sedikit beda (lebih gelap di web) |
| Danger | `#F44336` | `--danger: #e5484d` | 🟡 sedikit beda |
| Male / female avatar | `#2196F3` / `#E91E63` | sama di `avatar.tsx` `GENDER_COLORS` | ✅ sama |
| Font display/CTA | Poppins | `--font-display: "Poppins"...` | ✅ sama |
| Font body | Roboto (w300 ramping ala WA) | `--font-sans: "Roboto"...` | 🟡 web belum terapkan w300 ramping |
| Bubble out | `primary @25%` di atas `bgCard` | `--bubble-out: #d8ecff` / dark `#123f5e` | 🟡 mirip tapi bukan formula yang sama |
| Mode gelap | default **gelap** (`isDark ?? true`) | default **terang** (disengaja, diputuskan sebelumnya) | ✅ beda disengaja |

### 7.2 Tipografi — gap terbesar 🟡

Mobile punya skala token ketat (`AppText`: micro 10, caption 11, label 12, bodySmall 12, body 14, bodyStrong 14, button 16, title 17, headline 20, display 24) + **slider ukuran font chat** (14–18pt, basis 16, default 14.5) yang mengubah SEMUA teks di dalam percakapan (isi bubble, nama pengirim, jam, kutipan, kode, kolom ketik).

Web belum punya:
- Slider ukuran font chat di Pengaturan (fitur mobile, tidak ada di web)
- Bobot ramping w300 pada body/bubble — web masih memakai bobot default, jadi teks terlihat lebih tebal dari Android
- Token micro (10pt) untuk timestamp/badge — web memakai 10.5–11px di beberapa tempat (dekat, tapi tidak konsisten)

### 7.3 Gap UI per layar (harus disamakan)

Prioritas: **U0** = terlihat sepanjang sesi (nav, chat, list) · **U1** = sering dilihat · **U2** = kadang.

| # | Area | Mobile | Web | P |
|---|---|---|---|---|
| U1 | **Bottom nav** | 4 tab: Online, Chats, **Timeline**, **Profil** + notch tengah (FAB khusus) + pil M3 animasi | 2 tab saja (Online, Chat) + tombol Grup & Settings terpisah — tidak ada Timeline/Profil sebagai tab | U0 |
| U2 | **Bubble keluar** | `alphaBlend(primary 25%, bgCard)` — dinamis ikut tema | `#d8ecff` statis (light) / `#123f5e` (dark) — beda rumus, perbedaan halus terlihat | U0 |
| U3 | **Swipe-to-reply** | Geser bubble ke kanan → reply (widget `SwipeToReply`) | Tidak ada (hanya tombol/menu) | U0 |
| U4 | **Tahan bubble → toolbar reaksi** | 600ms (`AppTiming.longPressBubble`) memunculkan bar reaksi cepat 7 emoji: `👍❤️😂😮😢🙏😁` + sheet "lebih banyak" (14 emoji lagi) | Tidak ada long-press; reaksi hanya lewat tombol kecil; daftar web 6 emoji (`👍❤️😂😮😢🙏`) — kurang `😁`, dan tidak ada sheet "lebih banyak" | U0 |
| U5 | **Slider ukuran font chat** | Pengaturan → slider 14–18pt, mempengaruhi semua teks percakapan, tersimpan lokal | Tidak ada | U1 |
| U6 | **Header profil mobile** | Gradient `headerGradient` (primary→accent) di atas avatar | Web pakai gradient lembut `primary/15 → transparent` di ProfileDrawer — mirip nuansa, beda intensitas | U1 |
| U7 | **Warna status tunggal** | `statusColor()` satu sumber: online `#4CAF50`, idle `#FFB300`, offline `#BDBDBD` | Web menyebar inline; belum satu sumber token | U1 |
| U8 | **Quick side menu** | Menu tepi kanan halaman Online: Timeline (ungu `#8B5CF6`), Room (oranye `#FF7043`), Buat Grup (emerald `#10B981`) — warna khas mencolok | Tidak ada padanan (web hanya tombol Grup di header chats) | U1 |
| U9 | **Transisi halaman** | Slide dari kanan 250ms/220ms global (rasa Android native) | Default browser/React tanpa transisi halaman khusus | U2 |
| U10 | **Tooltip/tahan ikon** | Muncul setelah 450ms (disamakan dengan long-press) | Native browser title (±1s) | U2 |
| U11 | **Snackbar** | Floating, radius 12, inset 16 dari tepi, warna `#424242` (light) | Web pakai Sonner (posisi top-center) — mekanisme beda, boleh dipertahankan, tapi posisi/radius bisa disamakan | U2 |
| U12 | **Chip/badge** | radius 20 (pill), bg `bgInput`, selected `primary @15%` | Web sudah pakai pill — ✅ hampir sama | — |
| U13 | **Kartu/dialog** | radius 12, border 1.5px `divider`, elevation 0 | Web radius 12–16, border 1px — ✅ cukup dekat | — |
| U14 | **Emoji composer** | Mobile: picker penuh (sheet) | Web: 12 emoji statis di popover — fungsional, lebih terbatas | U2 |

### 7.4 Yang TIDAK perlu disamakan (beda platform wajar)

| Item | Alasan |
|---|---|
| Notch/FAB fisik di bottom nav | Web desktop tidak punya gesture area; pil M3 cukup diwakili hover/active state |
| Ripple Material 90ms | Web memakai hover/active transition — sudah lazim |
| Splash/exit animasi OS | Kontrol OS, bukan app |
| Safe-area notch top | Web sudah pakai `env(safe-area-inset-top)` di ChatPage header — ✅ |

### 7.5 Rencana eksekusi UI (disisipkan ke fase yang ada)

| Fase | Item UI |
|---|---|
| **Fase G (grup)** | U1 tab Timeline/Profil ditunda sampai fitur timeline ada; untuk grup: tambah tab "Grup" di nav bawah web (menggantikan tombol header) |
| **Fase C (chat)** | U3 swipe-to-reply · U4 long-press toolbar + 7 emoji + sheet · U2 formula bubble keluar · U5 slider font · U7 token statusColor |
| **Fase S (sosial)** | U1 tab Timeline & Profil · U8 quick side menu · U6 header gradient · U9 transisi halaman · U11 snackbar |
| **Kapan pun (cepat)** | Samakan `--online` → `#4CAF50`, `--danger` → `#F44336`, `kQuickReactions` +`😁`, QUICK_REACTIONS web +`😁` |
