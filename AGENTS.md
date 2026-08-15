# AGENTS.md — Carwash Admin Dashboard

## Konteks Project
Aplikasi ini adalah **Admin Dashboard** untuk manajemen usaha steam/cuci mobil dan motor.
Scope project ini **khusus sisi admin**: monitoring, pengelolaan master data, pengelolaan user,
rekap transaksi, detail transaksi, analitik sederhana, dan export laporan.

**Jangan membangun atau mengasumsikan UI kasir di project ini.**
Flow input transaksi kasir berada di luar scope Admin Dashboard.
Data transaksi yang tampil di dashboard dianggap sebagai data operasional yang sudah tersimpan
di database.

## Batasan Scope

### Termasuk
- Dashboard overview admin
- Rekap transaksi berdasarkan periode/tanggal
- Pengelompokan transaksi berdasarkan tanggal
- Detail seluruh transaksi pada tanggal tertentu melalui modal/popup
- Pencarian dan filter transaksi
- Ringkasan pendapatan kotor
- Ringkasan jatah karyawan
- Ringkasan pendapatan bersih/jatah pemilik
- Pengelolaan jenis kendaraan dan tarif
- Pengelolaan akun/user
- Edit dan hapus transaksi jika permission admin mengizinkan
- Export laporan PDF dan Excel
- Pengaturan yang berkaitan dengan Admin Dashboard

### Tidak termasuk
- Halaman kasir
- Form input transaksi kasir
- UI touch-friendly untuk tablet kasir
- Flow login khusus kasir
- Workflow operasional kasir
- Fitur Android/native app untuk kasir
- Pengembangan POS input baru kecuali diminta secara eksplisit

Jika sebuah requirement menyangkut proses input transaksi dari sisi kasir, **jangan implementasikan
secara otomatis**. Anggap data transaksi sudah tersedia dan fokus pada bagaimana admin melihat,
menganalisis, mengubah, atau mengekspornya.

## Arsitektur
Fokus web-only. Satu aplikasi Next.js yang menyediakan Admin Dashboard melalui browser desktop,
laptop, atau HP.

- **Web App**: Next.js + React + TypeScript
- **Backend/Database**: MySQL / MariaDB (migrasi dari Supabase/PostgreSQL)
- **Auth**: NextAuth.js (Credentials Provider) + JWT
- **UI**: komponen React yang konsisten dengan desain Admin Dashboard
- **Hosting**: dapat menggunakan platform Node/Next.js seperti Vercel atau VPS sesuai kebutuhan deployment

Jangan menambahkan backend/framework baru tanpa alasan yang kuat. Jangan over-engineer karena ini
adalah internal tool skala kecil.

## Role & Akses
Project ini berfokus pada **role admin**.

Admin dapat:
- melihat dashboard dan seluruh data yang diizinkan
- melihat seluruh transaksi
- memfilter transaksi berdasarkan periode
- mencari transaksi berdasarkan plat, kasir, jenis kendaraan, atau atribut relevan
- membuka detail transaksi berdasarkan tanggal
- melihat ringkasan pendapatan
- mengelola jenis kendaraan dan tarif
- mengelola user
- melakukan edit/hapus transaksi sesuai permission
- melakukan export laporan

Jika role atau permission perlu divalidasi, validasi harus dilakukan di server/database, bukan hanya
dengan menyembunyikan tombol di UI.

## Auth Strategy (Setelah Migrasi)
- UI login menggunakan **username + password** (tanpa email) — tampilan login **tidak diubah**.
- Di balik layar, gunakan **NextAuth.js** dengan `CredentialsProvider`.
- Session disimpan di cookie (JWT).
- Admin-only route/action wajib memastikan user yang login memiliki role `admin` melalui **middleware** (`src/middleware.ts`) dan pengecekan di setiap API route.
- Jangan mengandalkan proteksi UI saja.

## Database Schema & Migrations (MySQL/MariaDB)
- Source of truth schema database ada di `migrations/` (format MySQL).
- Jangan edit schema langsung lewat MySQL CLI/phpMyAdmin untuk perubahan struktural.
- Untuk perubahan schema, buat migration baru di `migrations/` dengan format `000X_deskripsi_singkat.sql`.
- **RLS (Row Level Security) tidak dipakai lagi** — semua otorisasi dikelola di middleware dan API guard.
- Gunakan `mysql2/promise` sebagai driver, dengan pool koneksi di `src/lib/db.ts`.
- Semua query harus **parameterized** (`?` placeholder) untuk mencegah SQL injection.

## Data Model Inti
Data utama yang digunakan Admin Dashboard:

### `users` (dulu `profiles`)
- id (UUID/CHAR(36))
- username (unik)
- password_hash (bcrypt)
- role (ENUM: 'admin', 'kasir' — tapi hanya admin yang dipakai di scope ini)
- status/aktif (TINYINT(1))

### `jenis_kendaraan`
- id
- kategori/jenis kendaraan
- tarif_default (DECIMAL)
- jatah_karyawan (DECIMAL)
- jatah_pemilik (DECIMAL)

### `transaksi`
- id
- tanggal/waktu transaksi (DATETIME)
- jenis_kendaraan_id (foreign key)
- plat_nomor (VARCHAR)
- tarif_total (DECIMAL)
- tarif_jatah_karyawan (DECIMAL)
- tarif_jatah_pemilik (DECIMAL)
- kasir_id / user_id (foreign key ke users)

**Penting:** nilai tarif dan pembagian yang disimpan pada transaksi adalah snapshot transaksi.
Jangan menghitung ulang transaksi lama menggunakan tarif master terbaru kecuali memang sedang
melakukan proses edit transaksi secara eksplisit.

## Dashboard & Rekap
Admin Dashboard harus memprioritaskan informasi yang membantu owner/admin memahami kondisi usaha.

### Ringkasan utama
Minimal dapat menampilkan:
- Pendapatan kotor
- Pendapatan bersih/jatah pemilik
- Total transaksi
- Rata-rata pendapatan per hari
- Breakdown jatah karyawan vs pemilik jika relevan

### Filter periode
- custom date range
- harian
- mingguan
- bulanan jika diperlukan oleh UI

Pastikan timezone bisnis menggunakan **WIB / Asia/Jakarta** secara konsisten.
## Database Timezone Contract
- MySQL/MariaDB `DATETIME` columns store **UTC** (`YYYY-MM-DD HH:mm:ss`), not WIB.
- `src/lib/datetime.ts` is the single application boundary for WIB/UTC conversion.
- `src/lib/db.ts` uses `dateStrings: true` so MySQL `DATETIME` values are not silently interpreted using the hosting OS timezone.
- Date filters from the UI are WIB dates and are converted to UTC before SQL queries.
- Do not use `new Date("YYYY-MM-DD HH:mm:ss")` on a database `DATETIME` value directly.

## Migration Commands
- `npm run db:migrate` applies ordered SQL files in `migrations/` and records them in `schema_migrations`.
- `npm run db:create-admin -- admin password "Nama Admin"` creates/updates a local admin with a bcrypt password hash.
- `npm run migrate-data` imports users, vehicle master data, and transactions from Supabase. `SUPABASE_DB_URL` is preferred because it can read `auth.users.encrypted_password` and preserve existing login passwords.
