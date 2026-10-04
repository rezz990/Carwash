export type ChangelogEntry = {
  version: string
  tanggal: string
  items: string[]
}

// Setiap ada update, tambahkan entri baru di PALING ATAS dengan version berbeda.
// Popup "Apa yang baru?" memakai entri pertama sebagai versi terbaru.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
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
