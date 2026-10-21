# Filter Online — Referensi Android (sumber kebenaran)

Dibaca langsung dari repo mobile (`~/Documents/chatyuk`) pada 2026-10-21.
**Web WAJIB meniru ini persis.** Jangan menebak.

## Sumber kode Android

| Bagian | File |
|---|---|
| Daftar filter & state | `lib/screens/online_users/widgets/user_list_section.dart` (baris 98–117) |
| Dropdown negara (multi-select) | `lib/screens/online_users/widgets/filter_dropdown.dart` |
| Dropdown gender (single-select) | `lib/widgets/search_dropdown.dart` |
| Data 141 negara | `lib/config/regions_countries.dart` → `const List<String> allCountries` |
| Logika filter | `lib/screens/online_users_screen.dart` (baris ~805–825) |
| Test | `test/online_country_dropdown_keyboard_test.dart`, `test/search_dropdown_keyboard_test.dart` |

## Tata letak

Dua field **berdampingan** dalam satu baris, masing-masing `Expanded`,
jarak antar field **12 px**, padding baris: `left 16, top 8, right 16, bottom 2`.

```
┌──────────── Negara ────────────┐  ┌────────── Gender ──────────┐
│ 🌐  Semua negara            ▾  │  │ 👤  Semua               ▾  │
└────────────────────────────────┘  └────────────────────────────┘
```

- Kiri: **Negara** — ikon `Icons.public`, **multi-select**, 141 negara.
- Kanan: **Gender** — ikon `Icons.person_outline`, **single-select**, 3 opsi.

## Perbedaan penting antara keduanya

| Aspek | Negara | Gender |
|---|---|---|
| Jenis | **Multi-select** (checklist) | **Single-select** |
| Jumlah opsi | **141** (`allCountries`) | **3** (`all` / `male` / `female`) |
| Label opsi | nama negara apa adanya | `Semua` / `Laki-laki` / `Perempuan` |
| Field cari di panel | **ADA** (search live, hint "Cari negara") | **TIDAK ADA** (opsi sedikit) |
| Tombol footer panel | **Reset** + **Terapkan (n)** | tidak ada |
| Teks field saat kosong | "Semua negara" (filterAll) | "Semua" |
| Teks field 1 dipilih | nama negara itu | "Laki-laki"/"Perempuan" |
| Teks field >1 dipilih | "`n` negara" (`selCountriesCount`) | tidak berlaku |
| Ikon X di field | ada, hanya jika ada pilihan → mengosongkan | ada (panah tetap) |
| Commit | hanya saat tekan **Terapkan**; tap luar = **batal** | langsung saat item dipilih |

## Wujud panel (terancung, menempel di field)

Berlaku untuk kedua dropdown (`OverlayPortal` + `CompositedTransformFollower`):

- Panel **menempel 4 px di bawah field**, lebarnya = lebar field
  (negara: `fieldWidth + 96`, di-clamp ke tepi layar).
- Sudut **12 px**, border `AppTheme.divider`, shadow hitam 25% blur 16 offset (0,8).
- **Buka ke atas** bila ruang bawah < 150 px dan ruang atas lebih besar.
- Tinggi maksimum: 300 px (gender) / 340 px (negara).
- Tap di luar panel = tutup (negara: **batal**, tidak commit).

### Isi panel negara
1. Field cari (tinggi 40 px, ikon kaca pembesar, hint "Cari negara").
2. Daftar `CheckboxListTile` dense — checkbox di **kanan**, aktif = warna primary.
3. Divider.
4. Footer: `Reset` (kiri, ikon filter-off) + `Terapkan (n)` (kanan, tombol filled primary, tinggi 40 px).

### Isi panel gender
- Daftar item saja, tiap baris: label (kiri) + **ikon centang** (kanan) bila terpilih.
- Item terpilih: warna **primary** + `fontWeight: w700`.
- Tanpa cari, tanpa footer. Tap item → langsung terapkan & tutup.

## Field (kotak input)

- `InputDecorator` dengan `labelText` (label melayang di atas), ikon awalan 20 px.
- Panah `Icons.arrow_drop_down_rounded` ukuran 28 px di kanan.
- Padding: horizontal 12, vertical 12.
- Font isi: `AppText.bodySmall` (12 px).

## Logika filter (urutan sama)

```dart
if (_negaraSel.isNotEmpty && !_negaraSel.contains(u.country)) return false;
if (_gender != 'all' && u.gender != _gender) return false;
if (_search.isNotEmpty && !u.nickname.toLowerCase().contains(_search.toLowerCase())) return false;
```

Negara = **daftar** (cocok jika salah satu), gender = **tunggal**.
Filter negara tidak dijalankan lewat server; `get_online_users` hanya menerima
`p_country` tunggal untuk scope, penyaringan penuh dilakukan di klien.

## Status di web (sebelum perbaikan)

❌ **BELUM SESUAI.** Web saat ini:
- Negara diubah menjadi dropdown 2 opsi ("Sekitar Indonesia" / "Semua negara") — **salah**,
  seharusnya multi-select 141 negara.
- Chip gender diganti dropdown 3 opsi — benar secara data, tapi gayanya belum
  persis (belum ada centang/bold primary, panel belum terancung menempel).

## Rencana perbaikan web

1. `countries.ts` → ekspor `ALL_COUNTRIES` (141 nama, sama persis `allCountries`).
2. `CountryMultiSelect` — meniru `FilterDropdown`: search live, checkbox kanan,
   footer Reset/Terapkan, commit hanya saat Terapkan.
3. `GenderDropdown` — meniru `SearchDropdown`: item terpilih primary+bold+centang.
4. Kedua field berdampingan `grid-cols-2 gap-3`, ikon public/person.
5. Filter klien: `countries.includes(user.country)` dan `gender === 'all' || user.gender === gender`.
6. Test: jumlah negara 141, commit-on-apply, batal saat tap luar, gender langsung.
