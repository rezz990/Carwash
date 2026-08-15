---
description: Implements and maintains the admin dashboard for the car wash management system, including dashboard overview, transaction recap, date-grouped transaction details, filters, transaction management, and admin-only UI behavior. Use when building or modifying Admin Dashboard features.
---

# Admin Dashboard Flow

## Tujuan
Skill ini khusus untuk **Admin Dashboard** aplikasi manajemen car wash.
Jangan menggunakan skill ini untuk membangun flow input transaksi kasir.

Data transaksi dianggap sudah tersedia di database. Fokus utama adalah bagaimana admin melihat,
mengelola, memfilter, menganalisis, dan mengekspor data tersebut.

## Scope Fitur

### 1. Dashboard Overview
Admin dapat melihat ringkasan seperti:
- pendapatan kotor
- pendapatan bersih/jatah pemilik
- total transaksi
- rata-rata pendapatan per hari
- breakdown jatah karyawan vs pemilik jika relevan

### 2. Filter Periode
Dukung sesuai kebutuhan UI:
- tanggal mulai
- tanggal akhir
- harian
- mingguan
- bulanan

Gunakan timezone bisnis WIB / Asia/Jakarta secara konsisten.

### 3. Detail Transaksi Berbasis Grup Tanggal
**Aturan UX utama:** transaksi dengan tanggal yang sama harus disatukan menjadi satu grup/baris.

Contoh:

```text
12 Agustus 2026 | 18 transaksi | Rp550.000 | Rp210.000 | Rp340.000 | Lihat
11 Agustus 2026 | 24 transaksi | Rp720.000 | Rp280.000 | Rp440.000 | Lihat
```

Jangan menampilkan ratusan transaksi tanggal yang sama sebagai baris terpisah di halaman utama.

Ketika admin memilih sebuah tanggal:

```text
Klik 12 Agustus 2026
        ↓
Modal / popup
        ↓
Seluruh transaksi 12 Agustus 2026
```

Modal minimal menampilkan:
- waktu
- jenis kendaraan
- plat nomor
- kasir/user pencatat
- tarif total
- jatah karyawan
- jatah pemilik/bersih
- aksi edit/hapus jika tersedia
- jumlah transaksi
- total kotor
- total karyawan
- total pemilik

### 4. Search
Search dapat menggunakan:
- plat nomor
- kasir/user pencatat
- jenis kendaraan
- atribut transaksi lain yang relevan

Jika hasil search berasal dari transaksi tertentu pada suatu tanggal, tanggal tersebut tetap menjadi
grup yang ditampilkan.

Saat modal dibuka, tampilkan transaksi sesuai konteks filter/search yang aktif. Jangan membuat hasil
search terlihat seolah-olah transaksi pada tanggal lain ikut masuk ke grup.

### 5. Edit Transaksi
Jika admin diberi permission untuk edit:
- validasi di server
- pertahankan snapshot tarif transaksi kecuali edit memang mengubah nilai tersebut
- tampilkan konfirmasi/feedback yang jelas
- refresh/revalidate data setelah berhasil

### 6. Hapus Transaksi
Jika admin diberi permission untuk delete:
- wajib konfirmasi
- gunakan server-side authorization
- tampilkan loading state
- tampilkan error jika gagal
- refresh/revalidate data setelah berhasil

Karena transaksi berhubungan dengan uang, jangan melakukan delete diam-diam.

## Aturan Data
- Jangan mengubah schema database hanya karena UI membutuhkan grouping tanggal.
- Grouping tanggal dilakukan melalui transformasi data/query/UI.
- Transaksi lama menggunakan snapshot nilai tarif yang tersimpan pada transaksi.
- Jangan menghitung ulang histori menggunakan tarif master terbaru secara otomatis.

## UI/UX
- Admin Dashboard terutama digunakan pada desktop/laptop.
- Tetap responsive pada HP.
- Gunakan tabel atau card yang mudah dipindai.
- Grup tanggal harus jelas secara visual.
- Modal detail harus memiliki scroll internal untuk tanggal dengan banyak transaksi.
- Gunakan format Rupiah Indonesia.
- Gunakan format tanggal Indonesia.
- Sediakan loading, empty, dan error state.
- Jangan menggunakan UI kasir/touch-first sebagai default.

## Performance
Untuk dataset kecil, grouping di server/client masih dapat digunakan.
Jika data mulai besar:
- filter transaksi di server/database
- gunakan agregasi database untuk SUM/COUNT/GROUP BY
- jangan mengambil seluruh histori jika hanya diperlukan satu tanggal
- pertimbangkan fetch detail transaksi ketika modal tanggal dibuka

## Security
Semua operasi admin wajib tetap divalidasi server-side/database.
Menyembunyikan tombol di UI bukan security boundary.

Pastikan:
- route admin terlindungi
- server action admin terlindungi
- RLS tetap aktif
- service role hanya digunakan di server untuk kebutuhan yang benar-benar memerlukannya

## Hal yang Tidak Boleh Dilakukan
- Jangan menambahkan form input transaksi kasir.
- Jangan membangun flow kasir.
- Jangan menambahkan UI tablet kasir tanpa instruksi eksplisit.
- Jangan mengubah dashboard menjadi POS kasir.
- Jangan membuat satu row per transaksi di halaman utama jika requirement grouping tanggal masih berlaku.
- Jangan mengubah database hanya untuk membuat modal grouping tanggal.
