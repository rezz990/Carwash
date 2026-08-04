# AGENTS.md — POS Steam Cuci Kendaraan
 
## Konteks Project
Aplikasi POS (Point of Sale) untuk usaha steam cuci mobil/motor. Mencatat
transaksi cuci kendaraan per jenis/ukuran, dengan split pendapatan antara
jatah karyawan dan jatah pemilik usaha, serta rekap yang bisa difilter.
 
## Arsitektur
Fokus web-only. Satu aplikasi Next.js yang diakses lewat browser di semua
device — tablet (kasir) maupun laptop/HP (admin). TIDAK ada app Android
native terpisah (opsi ini pernah dipertimbangkan tapi belum disetujui dan
kemungkinan tidak akan dilanjutkan — jangan bangun/asumsikan app Android
kecuali ada instruksi eksplisit di masa depan).
 
- **Backend/Database**: Supabase (Postgres + Auth + auto-generated API)
  - Alternatif kalau target deployment ternyata shared hosting PHP saja:
    pertimbangkan Laravel + MySQL/MariaDB sebagai pengganti penuh
- **Web App**: Next.js, satu codebase untuk kedua role
  - Diakses kasir dari tablet (browser, bisa dijadikan PWA agar terasa
    seperti app — icon di homescreen, dll — tapi tetap satu web app, bukan
    native app terpisah)
  - Diakses admin dari laptop/HP untuk kelola data & rekap
  - Hosting: Vercel (free tier, traffic kecil karena internal use)
## Role & Akses
- **kasir**: input transaksi baru, lihat & filter history transaksi (semua,
  bukan cuma miliknya sendiri kecuali dinyatakan lain), TIDAK bisa ubah master
  data (tarif, jenis kendaraan, user lain)
- **admin**: full access — bisa atur hampir seluruh fitur:
  - CRUD jenis kendaraan & tarif default
  - Atur skema split tarif (jatah karyawan vs jatah pemilik)
  - CRUD akun user (tambah/hapus/reset password kasir, tambah admin lain)
  - Lihat & filter semua transaksi + rekap semua periode
  - Export rekap (PDF/Excel)
  - Kemungkinan: edit/hapus transaksi yang salah input (butuh konfirmasi
    apakah ini diperbolehkan langsung atau harus lewat approval)

## Auth Strategy
UI login HANYA menampilkan username + password — TIDAK ada field email yang
terlihat oleh user. Di balik layar, tetap pakai Supabase Auth (bukan sistem
auth custom) supaya dapat semua keamanan bawaan (password hashing, session,
dan RLS lewat `auth.uid()`).

## Database Schema & Migrations
- Source of truth schema database ada di `supabase/migrations/0001_init_schema.sql`
- JANGAN edit schema langsung lewat Supabase dashboard/Table Editor untuk
  perubahan struktural (tambah kolom/tabel). Selalu buat migration file baru
  di `supabase/migrations/` dengan format `000X_deskripsi_singkat.sql`
- Cara apply migration: pakai Supabase CLI (`npx supabase db push`) setelah
  project di-link ke Supabase project yang sudah ada
  (`npx supabase link --project-ref <ref>`)
- Kalau butuh ubah schema (tambah kolom, ubah RLS policy, dll), buat migration
  baru — jangan modifikasi file `0001_init_schema.sql` yang sudah pernah di-apply
- Setelah setiap migration baru dibuat, generate ulang TypeScript types dari
  schema (`npx supabase gen types typescript`) supaya kode aplikasi tetap
  type-safe dan sinkron dengan struktur database aktual
## Catatan Penting
Usaha ini TIDAK punya variasi layanan (bukan steam biasa vs steam+wax vs
detailing, dll). Tarif murni ditentukan dari **jenis & ukuran kendaraan saja**
(Motor Kecil/Besar, Mobil Kecil/Sedang/Besar). Jangan tambahkan field/tabel
`layanan` atau opsi pemilihan layanan di UI manapun — ini bukan bagian dari
scope project.
 
## Data Model Inti
- `user`: id, username, password (hashed), role (kasir/admin)
- `jenis_kendaraan`: kategori (Motor Kecil/Besar, Mobil Kecil/Sedang/Besar),
  tarif_default
- `transaksi`:
  - tanggal, waktu (otomatis/timestamp, tidak diinput manual)
  - jenis_kendaraan
  - plat_nomor (format plat Indonesia: kode wilayah - angka - kode belakang)
  - tarif_total
  - tarif_jatah_karyawan (split dari tarif_total — skema split masih perlu
    dikonfirmasi: persentase atau nominal tetap per transaksi)
  - tarif_jatah_pemilik (split dari tarif_total)
  - kasir_id (siapa yang input)
## Flow Utama — jangan modifikasi struktur tanpa konfirmasi ulang
Flow ini one-shot input (satu form per transaksi, bukan multi-step):
 
1. **Login**: username + password
2. **Input Data** (satu form, sekali input per transaksi):
   - Tanggal & waktu (jam, menit, detik) → OTOMATIS, ambil dari system time,
     jangan buat input manual
   - Jenis kendaraan → pilih dari kategori:
     - Motor: Kecil, Besar
     - Mobil: Kecil, Sedang, Besar
   - Plat nomor → input sesuai format plat Indonesia
   - Tarif → otomatis muncul dari jenis kendaraan, lalu split ke:
     - Jatah karyawan
     - Jatah pemilik
3. **Rekap/Sortir**: harian, bulanan, mingguan — filter by date
## Fitur Rekap
- Periode: harian, mingguan, bulanan (tahunan belum dikonfirmasi, tambahkan
  kalau diperlukan)
- Filter by date (custom range)
- Kasir juga bisa lihat semua history transaksi, dengan filter — bukan
  cuma dibatasi ke hari ini
- Breakdown jatah karyawan vs jatah pemilik harus muncul di rekap, ini
  kemungkinan salah satu tujuan utama fitur rekap
- Export: PDF & Excel (format kolom mengikuti contoh referensi kalau nanti
  ada — lihat skill report-export)
## Yang Masih Perlu Dikonfirmasi
- [ ] Daftar lengkap jenis kendaraan + harga masing-masing
- [ ] Daftar kasir yang akan pakai sistem
- [ ] Jenis hosting target deployment (shared hosting PHP / VPS / lainnya)
- [ ] Contoh format rekap manual yang biasa dipakai (kalau ada, untuk acuan
  export)
- [ ] Metode pembayaran yang perlu dicatat (cash saja / cash+QRIS/dll)
- [ ] Skema persis split tarif karyawan/pemilik (persentase atau nominal tetap)
- [ ] Apakah plat nomor wajib diisi atau boleh dikosongkan
## Preferensi Umum
- Bahasa komentar kode: Bahasa Indonesia atau Inggris, konsisten pilih salah satu
- UI kasir: tombol besar, touch-friendly (tablet), minim scroll, minim ketik manual
- Jangan over-engineer — ini internal tool skala kecil, bukan produk komersial besar
- Jangan asumsikan model AI yang dipakai; tulis instruksi yang model-agnostic
<!-- BEGIN:nextjs-agent-rules -->
 
# This is NOT the Next.js you know
 
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.
 
This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
 
<!-- END:nextjs-agent-rules -->