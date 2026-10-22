# Opsi Privasi Media (C5) — Belum Diputuskan

Status: **TUNDA** (perlu keputusan desain bersama mobile).
Tanggal: 2026-10-21.

## Masalah

Bucket `chat-photos` saat ini **publik**:

```
storage.buckets: chat-photos → public = true
policy: chat_photos_public_read → qual = (bucket_id = 'chat-photos')
```

Artinya **siapa pun yang memiliki URL** (atau bisa melakukan list) dapat
mengakses **foto chat, voice note, video, dan dokumen privat** 1:1.

Web memakai `getPublicUrl()` → URL permanen tanpa token:

```ts
supabase.storage.from('chat-photos').getPublicUrl(path).data.publicUrl
```

Yang **sudah** aman:
- Upload dibatasi fungsi `storage_object_owner_ok()` (peserta chat, fail-closed).
- Anon tidak bisa upload (403).
- Bucket kini punya `file_size_limit` 50 MB + allowlist MIME (21 tipe).

Yang **belum**: siapa pun bisa **membaca** bila tahu path.

## Kenapa belum diperbaiki

1. Dampak lintas aplikasi: mobile mengunduh lewat SDK (`storage.download`, pakai JWT),
   jadi mobile **tidak** rusak. Tapi web memakai `<img src>` publik → akan rusak total.
2. Signed URL menambah kompleksitas: refresh saat kedaluwarsa, chat lama harus re-sign.
3. Menyentuh avatar & sticker (dipakai di banyak layar + cache disk).

## Opsi

### Opsi 1 — Signed URL di web (rekomendasi bila ingin privat)

- Ubah bucket → `public = false`, hapus policy `chat_photos_public_read`.
- Web: ganti `getPublicUrl()` → `createSignedUrl(path, 3600)`.
- Perlu: cache URL + refresh sebelum kedaluwarsa; `onError` → re-sign.

| Pro | Kontra |
|---|---|
| Media privat sungguhan | Semua komponen media harus diubah |
| RLS konsisten dgn tabel lain | +1 request per media (bisa di-batch) |
| | Avatar/sticker ikut kena |

### Opsi 2 — Bucket privat + proxy Caddy ber-JWT

- Bucket privat; Caddy mem-proxy `/media/*` dan memvalidasi JWT + keanggotaan chat.
- Web tetap memakai URL sederhana.

| Pro | Kontra |
|---|---|
| URL tetap simpel | Perlu logika otorisasi di Caddy (bukan di DB) |
| Bisa cache di edge | Duplikasi aturan akses (risiko drift) |

### Opsi 3 — Tetap publik + mitigasi (status quo)

- Pertahankan publik, tetapi:
  - Path memakai UUID acak (sudah) → sulit ditebak.
  - Nonaktifkan `list` untuk anon.
  - Tambahkan disclaimer di UI/README.

| Pro | Kontra |
|---|---|
| Tanpa perubahan kode | Media tetap bisa diakses bila URL bocor |
| Tidak berisiko regresi | Tidak memenuhi ekspektasi "chat privat" |

### Opsi 4 — Hybrid

- Tetap publik untuk **avatar/sticker** (memang untuk ditampilkan).
- Privat + signed URL untuk **chat/**, **voice/** (isi percakapan).

| Pro | Kontra |
|---|---|
| Dampak terbatas pada media sensitif | Butuh 2 jalur resolusi URL |
| Avatar tetap cepat | Risiko salah pilih helper |

## Rekomendasi

**Opsi 4 (Hybrid)** — dampak paling kecil dengan hasil paling relevan:
isi percakapan jadi privat, sementara avatar/sticker tetap cepat & publik.
Butuh persetujuan karena mengubah perilaku mobile juga (perlu uji ulang
tampilan gambar di HP).

## Pertanyaan untuk keputusan

1. Setuju Opsi 4, atau langsung Opsi 1 (semua privat)?
2. Signed URL berlaku berapa lama? (usul 1 jam, refresh otomatis)
3. Perlu audit log akses media? (menambah beban tulis)


---

## Hasil uji bucket percobaan (C1) — 2026-10-22

Bucket uji `chat-photos-trial` (privat, 50 MB, 3 MIME) dibuat **sementara** untuk
menguji signed URL **tanpa menyentuh `chat-photos`**.

| Uji | Hasil |
|---|---|
| Upload ke bucket privat | ✅ 200 |
| `createSignedUrl(path, 60)` | ✅ token JWT |
| Akses signed URL | ✅ 200 |
| Akses URL publik tanpa token | ✅ 400 (gagal → privat) |
| Akses `object/authenticated` tanpa JWT | ✅ 400 (gagal) |

**Kesimpulan:** pola *bucket privat + signed URL* **berfungsi** di stack lokal.

Bucket uji + policy sementara **sudah dibuang** (dicek: 0 bucket, 0 policy, 0 objek).
`chat-photos` tetap `public = true` (belum diubah — sesuai kesepakatan: trial dulu, lapor).

### Catatan untuk penerapan nanti (bila disetujui)

- Web harus ganti `getPublicUrl()` → `createSignedUrl()` **plus** cache + refresh
  sebelum kedaluwarsa; `<img src>` biasa tidak bisa pakai signed URL yang kedaluwarsa
  tanpa refresh.
- Mobile **tidak terpengaruh**: mobile mengunduh lewat `storage.download()` (ber-JWT),
  bukan URL publik.
- Perlu signed URL juga untuk **avatar** & **sticker** (dipakai di banyak layar).
