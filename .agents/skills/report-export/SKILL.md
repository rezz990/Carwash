---
description: Implements PDF and Excel exports for the Admin Dashboard, using the selected date range and the same transaction/revenue definitions shown in the dashboard. Use when building or modifying admin report export features.
---

# Admin Report Export

## Tujuan
Skill ini khusus untuk fitur **Export laporan Admin Dashboard**.
Export harus merepresentasikan data yang sedang dilihat admin dan tidak membangun flow kasir.

## Scope
- Export Excel
- Export PDF
- Filter berdasarkan periode
- Ringkasan pendapatan
- Detail transaksi
- Rekap per tanggal
- Breakdown jatah karyawan vs jatah pemilik

## Prinsip Utama
Export harus konsisten dengan angka yang ditampilkan Admin Dashboard.
Jangan sampai dashboard menampilkan satu total sementara Excel/PDF menghasilkan total berbeda karena
logika filter atau timezone berbeda.

## Filter
Jika admin memilih:
- tanggal mulai
- tanggal akhir

maka export mengikuti periode tersebut.

Timezone bisnis: **WIB / Asia/Jakarta**.

## Data Detail
Jika export membutuhkan detail transaksi, kolom dapat mencakup:
- Tanggal
- Waktu
- Jenis kendaraan
- Plat nomor
- Kasir/user pencatat
- Tarif total
- Jatah karyawan
- Jatah pemilik/bersih

Gunakan nilai snapshot yang tersimpan pada transaksi.

## Rekap Per Tanggal
Untuk laporan yang bersifat summary, transaksi dengan tanggal sama dapat digabung menjadi satu
kelompok tanggal.

Contoh:

```text
Tanggal           Jumlah    Kotor       Karyawan    Pemilik
12 Agustus 2026     18     550.000      210.000     340.000
11 Agustus 2026     24     720.000      280.000     440.000
```

Jika format export membutuhkan detail, detail transaksi tetap boleh ditampilkan di bawah masing-masing
kelompok tanggal.

## PDF
PDF harus:
- mudah dibaca
- memiliki judul laporan
- menampilkan periode
- menampilkan ringkasan total
- menggunakan format Rupiah Indonesia
- menjaga tabel tetap rapi
- tidak memotong kolom penting

Jika transaksi banyak, gunakan pagination/halaman lanjutan.

## Excel
Excel harus:
- memiliki header yang jelas
- memiliki data yang konsisten dengan filter dashboard
- menggunakan format angka Rupiah/number yang sesuai
- memiliki total/subtotal jika dibutuhkan
- tidak memasukkan data di luar periode filter

## Validasi
Sebelum export:
- pastikan filter tanggal valid
- pastikan start date <= end date
- pastikan timezone tidak menggeser tanggal
- pastikan total export sama dengan total dashboard untuk periode yang sama

## Keamanan
Export adalah fitur admin.
Authorization harus dilakukan server-side.
Jangan menganggap menyembunyikan tombol export sebagai security boundary.

## Yang Tidak Termasuk
- form transaksi kasir
- receipt kasir
- UI kasir
- flow input transaksi
- optimasi POS kasir
