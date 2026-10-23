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

## Cakupan fase 1

Sudah: list, search, explore, join (termasuk password), room chat teks,
realtime INSERT, mark read, kirim pesan.

Belum: buat grup dari web, media di grup, voice room, poll, approval UI,
kelola anggota, hapus grup.
