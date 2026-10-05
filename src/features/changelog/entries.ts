export type ChangelogEntry = {
  version: string
  tanggal: string
  items: string[]
}

// Setiap ada update, tambahkan entri baru di PALING ATAS dengan version berbeda.
// Popup "Apa yang baru?" memakai entri pertama sebagai versi terbaru.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
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
