export type ChangelogEntry = {
  version: string
  tanggal: string
  items: string[]
}

// Setiap ada update, tambahkan entri baru di PALING ATAS dengan version berbeda.
// Popup "Apa yang baru?" memakai entri pertama sebagai versi terbaru.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "1.3.0",
    tanggal: "6 Oktober 2026",
    items: [
      "Menu Petugas Cuci kini menampilkan statistik performa: total kendaraan ditangani, rincian mobil dan motor, capaian hari ini dan bulan ini, serta waktu terakhir bertugas setiap petugas.",
      "Ringkasan baru di bagian atas halaman Petugas Cuci: jumlah petugas aktif dan nonaktif, plus total cucian hari ini per jenis kendaraan.",
      "Buka detail petugas untuk melihat ringkasan lengkap (termasuk capaian minggu ini) dan riwayat transaksi yang ditangani dengan penomoran halaman.",
    ],
  },
  {
    version: "1.2.0",
    tanggal: "5 Oktober 2026",
    items: [
      "Fitur baru: kelola petugas cuci di menu Petugas Cuci. Setiap transaksi kasir kini mencatat satu petugas.",
      "Aplikasi kasir memilih petugas dari daftar petugas aktif; petugas yang dinonaktifkan tidak bisa dipakai untuk transaksi baru.",
      "Nama petugas tampil di Transaksi terbaru dan detail transaksi per tanggal. Transaksi lama tetap aman tampil tanpa petugas.",
    ],
  },
  {
    version: "1.1.0",
    tanggal: "5 Oktober 2026",
    items: [
      "Dashboard kini menampilkan rincian transaksi dan pendapatan per kasir serta per jenis kendaraan untuk hari ini.",
      "Nama kasir tampil di daftar Transaksi terbaru.",
      "Perbaikan halaman login: pesan error lebih mudah terbaca, tombol lihat password lebih jelas, dan dukungan password manager.",
    ],
  },
  {
    version: "1.0.0",
    tanggal: "1 Oktober 2026",
    items: [
      "Dashboard overview: pendapatan kotor, bagian pemilik, jumlah transaksi, dan tren pendapatan per periode.",
      "Daftar transaksi terbaru dan aksi cepat ke halaman rekap, tarif, dan kelola user.",
    ],
  },
]
