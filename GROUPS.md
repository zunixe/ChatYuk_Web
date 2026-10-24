# Grup di Web (Room Privat)

Paritas dengan Android `room_service.dart` / `chat_service_room.dart`.

## Konsep penting

"Grup" di ChatYuk **bukan** tabel `groups`. Grup = baris `public.rooms`
dengan `is_private = true`, keanggotaan di `public.room_members`, dan pesan
di `public.messages` (kolom `room_id`) — **bukan** `private_messages`.

## Jalur data (terverifikasi)

| Kebutuhan | Cara | Catatan |
|---|---|---|
| Grup saya | `rpc('list_my_groups', {p_uid})` | hanya `authenticated` |
| Explore | `rpc('list_room_explore', {p_country})` | grup privat **tidak** muncul (sesuai Android) |
| Harga | `rpc('room_pricing')` | `join_paid`, `create_paid`, `create_pw_paid`, `multiplier` |
| Gabung | `rpc('join_private_room', {p_room_id, p_password})` | parameter password saja bila `has_password` |
| Baca pesan | `select` langsung `messages` | **JANGAN** `get_room_messages` — khusus admin |
| Kirim pesan | `insert` `messages` (type `text`) | maks 2000 karakter |
| Tandai dibaca | `rpc('mark_room_read')` | |
| Keluar | `rpc('leave_private_room')` | |

## Aturan server yang harus dihormati web

1. **Join grup privat gratis.** `join_private_room` jalur auto-join tidak
   memotong poin (komentar di server: "bukan mode koin"). `room_pricing()`
   masih memuat `join_paid = 5`, jadi **jangan** menampilkan biaya itu —
   dialog hanya menulis "bergabung gratis". Jika server kelak menagih,
   respons `charged > 0` menjadi sinyal untuk menghidupkan kembali tampilan biaya.
2. **Membuat grup berbayar** (`create_private_room`): `create_paid × multiplier`
   (100 × 3 = 300), dengan password 150 × 3. Dipotong **di server**.
3. **Poin memakai ledger**, bukan `profiles.points`. Tabelnya `coin_ledger`
   (bucket `bonus` → `topup` → `earned`) dan bersifat **append-only** (ada
   trigger `coin_ledger_no_mutate`). `profiles.points` hanyalah cermin hasil
   `wallet_sync_points(uid)`.
4. **RLS pesan privat**: hanya anggota yang bisa SELECT/INSERT; non-anggota
   mendapat 0 baris / ditolak. Sudah diuji.

## Halaman

| Route | Komponen |
|---|---|
| `/groups` | `src/features/groups/GroupsPage.tsx` (tab Grup saya / Explore) |
| `/groups/:groupId` | `src/features/groups/GroupRoomPage.tsx` (chat teks + realtime) |

Akses: tombol ikon `Users` di header `/chats`.

## Cakupan

Sudah:
- list, search, explore, join (termasuk password), room chat teks,
  realtime INSERT, mark read, kirim pesan
- **buat grup (A1)**: dialog nama (3–30), 12 ikon emoji (sama dengan
  `kGroupIcons` Android), opsi password (6–20), tampil biaya dari
  `room_pricing()`, tangani `duplicate: true`, dan tampilkan `join_token`

- **panel Info grup (A2+A3+A4+A5)**: daftar anggota + role, kick, jadikan
  admin/anggota, undang lewat pencarian profil, approve/reject permintaan
  gabung, ganti ikon emoji, atur/hapus password, perpanjang, hapus grup,
  keluar grup. Tombol dimoderasi hanya muncul untuk owner/admin; server
  tetap penegak akhir.

- **media di grup (A6)**: kirim gambar, video (maks 15 MB/60 dtk), file
  (maks 50 MB), voice note m4a, dan lokasi; render semua tipe lewat
  `MessageBubble` (gambar/voice/video/file/lokasi/sticker).

- **poll di grup (A7)**: render + voting. RPC khusus room:
  `get_room_poll_results`, `vote_room_poll` (bukan versi private).

- **lokasi live di grup (A8)**: tombol LIVE di composer → pilih durasi
  (15 mnt / 1 jam / 8 jam) → kirim payload
  `{lat,lng,label,live:true,exp,acc}` lalu perbarui koordinat tiap 30 detik
  sampai `exp` lewat (`UPDATE messages.text`, sama seperti Android
  `_startLiveLocationUpdates`). Bubble menampilkan badge **LIVE** +
  "Live · sampai HH.MM".

- **galeri media grup (A9)**: `/groups/:id/media` — kumpulan `messages.image_path`
  unik (terbaru dulu, maks 200), grid + preview layar penuh.
- **kode gabung (A10)**: panel info menampilkan `rooms.join_token` (read-only)
  + tombol salin tautan `…/groups/<id>?t=<token>`. Payload QR Android:
  `chatyuk://room/join?id=<id>&t=<token>`.

Belum: **buat poll dari web** (chat private web juga belum punya, jadi
paritas), voice room, **rotasi token** (policy `rooms_update` hanya admin →
owner `UPDATE 0`, terverifikasi), pemindai QR (`jsQR` bisa ditambah nanti)., ubah nama/deskripsi grup (mobile juga belum punya), upload
ikon gambar (mobile pakai storage `room-icons`).

### Path storage media grup — WAJIB `room_<roomId>`

Policy `storage_object_owner_ok` menolak `chat/<roomId>/...`. Untuk grup,
segmen path harus **`room_<roomId>`**, sama dengan Android
(`photoUploadChatId => 'room_${room.id}'`):

```
chat/room_<roomId>/<stamp>.jpg
voice/room_<roomId>/<stamp>.m4a
```

Bila salah, upload Storage mengembalikan **400** dan pesan tidak pernah
tersimpan. Ini sempat terjadi saat implementasi dan sudah diperbaiki.

### Pemetaan RPC panel info

| Aksi | RPC |
|---|---|
| Peran saya | `fn_room_role(p_uid, p_room_id)` → `owner`/`admin`/`member`/null |
| Anggota | `list_room_members_v2(p_room_id)` → `{user_id,nickname,gender,status,role,joined_at,last_seen}` |
| Permintaan | `list_room_join_requests(p_room_id)` → `{user_id,nickname,requested_at}` (owner/admin saja; selain itu error) |
| Approve / reject | `approve_join_request` / `reject_join_request(p_room_id,p_uid)` |
| Kick | `kick_room_member(p_room_id,p_uid)` |
| Undang | `invite_to_room(p_room_id,p_uid)` (bypass approval) |
| Role | `set_member_role(p_room_id,p_uid,p_role)` |
| Ikon | `update_room_icon(p_room_id,p_icon)` → `{ok,reason?}` |
| Password | `reset_room_password(p_room_id,p_new_password)`; `null` = hapus |
| Perpanjang | `extend_private_room(p_room_id)` → `{points}` |
| Hapus | `delete_private_room(p_room_id)` |

**Penting:** `rooms_update` policy hanya mengizinkan admin (email
`zunixe@gmail.com`) — jadi Owner **tidak bisa** mengubah `name`/`description`
lewat UPDATE langsung. Edit nama/deskripsi memang belum ada di mobile juga.

### Catatan implementasi buat grup

`createRoom()` di `src/lib/api/groups.ts` memanggil `create_private_room`
dan memetakan hasil `{id, points, join_token, duplicate}`. Biaya **dipotong
server** (`spend_room` di `coin_ledger`), bukan oleh klien — klien hanya
menampilkan estimasi `create_paid × multiplier` (300) atau
`create_pw_paid × multiplier` (450) dan menonaktifkan tombol bila saldo
kurang. Terverifikasi: grup terbentuk (`is_private`, `owner_id`, role
`owner`, `approval_required=true`), poin terpotong 300, lalu data uji
dibersihkan (ledger netto 0).
