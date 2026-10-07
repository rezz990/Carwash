# Changelog

Catatan perubahan Bujon Carwash, versi terbaru di atas. Changelog popup "Apa yang baru?" di aplikasi memakai `src/features/changelog/entries.ts`; file ini adalah versi lengkapnya.

## 1.4.0 — 6 Oktober 2026

### UX & performa
- Skeleton loading untuk halaman admin: `src/app/admin/loading.tsx` sebagai kerangka umum (judul, kartu statistik, daftar baris) plus bentuk khusus di `admin/rekap` (kartu periode, 4 kartu ringkasan, daftar tanggal) dan `admin/log-aktivitas` (kartu filter, baris tabel, pagination). Navigasi antarmenu kini memberi umpan balik instan, dan prefetch `<Link>` ikut membawa shell halaman.
- `getCurrentUser` (`src/lib/authz.ts`) dibungkus React `cache()`: pemanggilan berulang dalam satu request/render hanya menjalankan `getServerSession` dan satu query `users` sekali. Semua pengecekan (`aktif`, `session_version`, kedaluwarsa sesi) tidak berubah, dan memoisasi tetap per-request — tidak ada hasil yang disimpan lintas request.

## 1.3.0 — 6 Oktober 2026

### Statistik petugas cuci
- Setiap kartu petugas di menu Petugas Cuci menampilkan statistik dari data transaksi nyata: total kendaraan ditangani, total mobil, total motor, hari ini, bulan berjalan, dan terakhir bertugas (tanggal + jam WIB). Petugas yang belum pernah bertugas menampilkan "Belum pernah".
- Seksi ringkasan di atas halaman: total petugas, petugas aktif, petugas nonaktif, cuci hari ini, mobil hari ini, motor hari ini.
- Tombol "Lihat statistik" membuka detail per petugas: ringkasan (total, mobil, motor, hari ini, minggu ini, bulan ini, terakhir bertugas) dan riwayat transaksi ber-pagination 20 per halaman dengan waktu, kendaraan, plat, kasir, dan tarif.
- Statistik dihitung murni dari agregasi database per query — tanpa kolom counter di tabel petugas, tanpa N+1, dan tanpa mengambil semua transaksi ke client. Transaksi lama tanpa petugas diabaikan dari statistik (tidak ada backfill menebak petugas).
- Fitur ini statistik/performa saja: tidak ada perhitungan gaji, insentif, atau komisi.

## 1.2.0 — 5 Oktober 2026

### Menu Petugas Cuci (master data)
- Menu baru Petugas Cuci di sidebar admin: tambah, ubah nama, dan nonaktifkan petugas (status aktif/nonaktif, bukan penghapusan fisik). Nama duplikat ditolak.
- Migrasi `0010_petugas_cuci.sql`: tabel `petugas_cuci` baru, kolom `transaksi.petugas_id`, index, dan foreign key — semuanya idempoten.
- Setiap transaksi kasir kini mencatat tepat satu petugas cuci. Kasir memilih dari daftar petugas aktif; petugas nonaktif tidak bisa dipakai untuk transaksi baru.

### Mobile API
- Endpoint baru `GET /api/mobile/workers` mengembalikan daftar petugas aktif untuk aplikasi kasir.
- `petugasId` wajib pada pembuatan transaksi baru. Server menolak petugas yang tidak ada (`WORKER_NOT_FOUND`) atau nonaktif (`WORKER_INACTIVE`).
- Perbandingan idempotency ikut menyertakan `petugasId`: ID yang sama dengan petugas berbeda mengembalikan `IDEMPOTENCY_CONFLICT`. Kontrak lengkap di `MOBILE_API.md`.
- Daftar dan detail transaksi mobile menyertakan data `petugas`, atau `null` untuk transaksi lama yang belum memiliki petugas.

### Dashboard & rekap
- Nama petugas tampil di daftar Transaksi terbaru dashboard dan di detail transaksi per tanggal pada rekap.
- Transaksi lama tanpa petugas tetap aman ditampilkan seperti biasa.
