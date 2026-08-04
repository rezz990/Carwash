---
description: Implements the one-shot vehicle wash transaction input flow (single form covering vehicle type, plate number, and tariff split) for the car wash POS app, based on the owner's original handwritten flow. Use when building or modifying the transaction input screen, tariff split logic, or plate number field.
---

# POS Transaction Flow

## Sumber
Flow ini diambil PERSIS dari catatan flow yang sudah ditentukan. Jangan
modifikasi struktur flow tanpa konfirmasi ulang ke owner — ini bukan hasil
brainstorming developer, ini instruksi langsung dari yang punya usaha.

## Tujuan
Satu form input yang mencatat transaksi steam cuci kendaraan secara lengkap
dalam sekali submit, termasuk split tarif jatah karyawan/pemilik.

## Aturan Flow

### 1. Login
- Username + password sederhana
- Role dua jenis: kasir dan admin (admin dapat akses lebih luas ke rekap semua data)

### 2. Input Data (satu form, sekali submit per transaksi)
Urutan field mengikuti catatan owner:

1. **Tanggal & waktu (jam, menit, detik)** — OTOMATIS dari system time.
   Jangan buat input manual untuk field ini.
2. **Jenis kendaraan** — pilih dari tombol/opsi besar (touch-friendly):
   - Motor: Kecil, Besar
   - Mobil: Kecil, Sedang, Besar
3. **Plat nomor** — input mengikuti format plat Indonesia (kode wilayah huruf
   - nomor angka - kode belakang huruf), lihat sketsa kotak-kotak di catatan
   owner sebagai referensi format
4. **Tarif** — otomatis terisi berdasarkan jenis kendaraan yang dipilih
   (jangan biarkan kasir input harga manual), lalu split ke:
   - Jatah karyawan
   - Jatah pemilik
   - Skema split ini masih perlu dikonfirmasi ke owner: persentase tetap
     (mis. 30/70) atau nominal tetap per transaksi — JANGAN asumsikan,
     tanyakan atau tandai sebagai TODO kalau belum ada jawaban

### 3. Rekap/Sortir
- Filter periode: harian, mingguan, bulanan — semua by date (custom range)
- Kasir (bukan cuma admin) juga bisa mengakses history lengkap dengan filter
  yang sama, bukan dibatasi hanya transaksi hari ini
- Tampilkan breakdown jatah karyawan vs jatah pemilik di hasil rekap, bukan
  cuma total tarif — ini kemungkinan besar tujuan utama fitur rekap bagi owner

## Constraint UI
- Semua elemen pilihan (jenis kendaraan) pakai tombol besar, bukan dropdown
- Target tap minimal ~48dp untuk penggunaan di tablet
- Form input harus cepat diisi — owner ingin flow yang simpel dan langsung

## Yang Belum Jelas (jangan diasumsikan, tanyakan ke owner)
- Skema persis split tarif karyawan/pemilik
- Apakah plat nomor wajib diisi atau boleh dikosongkan
- Apakah rekap tahunan juga dibutuhkan (tidak disebut eksplisit di catatan asli)
- Apakah kasir boleh melihat/filter transaksi milik kasir lain, atau cuma
  transaksi yang dia sendiri input
