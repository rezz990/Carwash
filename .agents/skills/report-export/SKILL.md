---
description: Generates PDF and Excel export of transaction reports (daily/weekly/monthly/yearly) matching the format used by the business owner. Use when building or modifying report/export features.
---

# Report Export Format

## Status: BELUM LENGKAP
File ini perlu diisi setelah dapat contoh format rekap referensi (spreadsheet
manual yang biasa dipakai, atau screenshot/deskripsi kolom yang penting).

## Cara Mengisi Nanti
1. Kalau ada file Excel/Sheets rekap manual → simpan contohnya di folder
   `examples/` di sebelah file ini, lalu deskripsikan strukturnya di bawah
2. Kalau tidak ada file, tulis manual kolom-kolom yang wajib ada berdasarkan
   apa yang dibutuhkan

## Template yang Perlu Diisi

### Kolom Wajib (isi setelah konfirmasi)
- [ ] Tanggal
- [ ] Jenis kendaraan
- [ ] Harga
- [ ] Metode pembayaran
- [ ] Kasir yang menangani
- [ ] (tambahkan kolom lain sesuai kebutuhan)

### Level Agregasi
- [ ] Per transaksi (satu baris = satu transaksi), atau
- [ ] Sudah di-summary per hari/minggu/dll

### Format Output
- PDF: layout yang diharapkan (tabel sederhana / ada header logo usaha / dll)
- Excel: apakah perlu formula otomatis (total, subtotal) atau data mentah saja

## Instruksi Implementasi (setelah kolom di atas diisi)
Gunakan struktur kolom persis seperti didefinisikan di atas. Untuk Excel,
sertakan baris total di akhir per periode. Untuk PDF, pastikan layout tetap
rapi walau dicetak/dilihat di layar kecil (HP).
