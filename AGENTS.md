# AGENTS.md — Bujon Carwash

## Konteks Project
Aplikasi operasional usaha steam/cuci mobil dan motor. Ada dua permukaan:

1. **Admin Dashboard (web)** — fokus utama repo ini. Monitoring, rekap, master data, user, dan export.
2. **Mobile API (`src/app/api/mobile/*`)** — backend untuk aplikasi kasir Android yang dikembangkan di repo lain. Dokumen kontraknya: `MOBILE_API.md`.

Kode API mobile adalah bagian resmi project. Jangan hapus, rename, atau "rapikan" perilakunya tanpa diminta. Perubahan yang mengubah request/response wajib memperbarui `MOBILE_API.md`.

## Batasan Scope
### Termasuk
- Dashboard overview, rekap periode/tanggal, detail transaksi per tanggal (modal)
- Pencarian dan filter transaksi
- Ringkasan pendapatan kotor, jatah karyawan, jatah pemilik
- Pengelolaan jenis kendaraan/tarif, user, pengaturan (mis. timeout login)
- Edit/hapus transaksi oleh admin, backup/restore transaksi JSON
- Export PDF dan Excel, log aktivitas, notifikasi transaksi (SSE)
- Pemeliharaan API mobile beserta dokumennya

### Tidak termasuk
- UI kasir di web (halaman input transaksi, layar tablet kasir, login khusus kasir)
- Kode aplikasi Android (ada di repo lain)

Jika sebuah permintaan menyangkut input transaksi dari sisi kasir di web, jangan implementasikan otomatis. Tanyakan dulu.

## Arsitektur
Satu aplikasi Next.js (App Router) + TypeScript. Jangan menambah backend/framework baru tanpa alasan kuat. Ini internal tool skala kecil, jangan over-engineer.

- **Web**: Next.js 16, React 19, Tailwind 4
- **Database**: MySQL 8+ / MariaDB 10.4+ lewat `mysql2/promise`, pool di `src/lib/db.ts`
- **Auth web**: NextAuth (Credentials, JWT cookie), login pakai username + password
- **Auth mobile**: JWT access token 15 menit + refresh token 30 hari (di-rotate), tabel `mobile_sessions`
- **Hosting**: cPanel Node.js App (Passenger) dengan `output: "standalone"`. Bukan serverless.
  - Konsekuensi: `src/lib/events.ts` (SSE) dan `src/lib/loginRateLimit.ts` menyimpan state di memori proses. Jangan pindahkan ke serverless dan jangan asumsikan state itu dibagi antar proses.
- **Environment**: `develop` = staging (`dev.bujon.my.id`), `main` = production (`app.bujon.my.id`). Detail di `DEPLOYMENT.md`.

## Role & Otorisasi
- Role: `admin` dan `kasir`.
- Semua halaman dan aksi admin hanya untuk `admin`. Endpoint `/api/mobile/*` untuk `kasir` lewat `requireMobileAuth` (`src/lib/mobile/http.ts`).
- Validasi selalu di server. Menyembunyikan tombol di UI bukan proteksi.
- Web: `src/proxy.ts` memblokir `/admin/*` dan `/api/admin/*` bagi non-admin/sesi kedaluwarsa. Setiap server action dan API route admin tetap wajib memanggil `requireAdmin()` (`src/lib/authz.ts`). Jangan mengandalkan proxy saja.
- Kasir hanya boleh melihat transaksi miliknya sendiri di API mobile.

## Sesi & Keamanan
- Timeout idle dapat diatur admin (`app_settings.login_timeout_minutes`, default 60, min 5). Satu kebijakan di `src/lib/sessionPolicy.ts`, dipakai proxy, server guard, JWT callback, dan browser (`IdleLogout`). Jangan membuat logika kedaluwarsa kedua.
- `users.session_version` menaikkan versi saat password di-reset sehingga JWT web lama tidak berlaku. Ubah password harus ikut menaikkan `session_version`.
- Rate limit login ada di `src/lib/loginRateLimit.ts` (in-memory).
- `MOBILE_API_SECRET` dan `NEXTAUTH_SECRET` adalah dua secret berbeda, minimal 32 karakter. Jangan pernah commit, log, atau tulis nilainya di dokumen. Jangan membuat file `.env` masuk repo.
- Semua query **wajib parameterized** (`?`). Jangan menyusun SQL dengan string interpolation dari input.
- Jangan log password, token, atau hash.

## Struktur Kode
- `src/app/` — routing saja: halaman, layout, API route. Logika bisnis tidak ditaruh di sini.
- `src/features/` — fitur admin (dashboard, rekap, tarif, users, settings, activity-log, auth): UI + server actions.
- `src/components/` — komponen bersama (shell admin, UI, toast, animasi).
- `src/lib/` — infrastruktur: db, auth, authz, datetime, formatters, log aktivitas, `mobile/*`.
- `src/hooks/`, `src/types/` — hook client dan tipe bersama.
- `migrations/` — skema MySQL yang berlaku (sumber kebenaran).
- `scripts/` — migrate, seed, create-admin, bundle deploy.
- `tests/` — tes unit (`node --test` + `tsx`).
- Folder `supabase/` dan `scripts/migrate-data.ts` adalah sisa migrasi lama dari PostgreSQL/Supabase, bukan runtime. RLS tidak dipakai.

## Database & Migrasi
- Skema hanya berubah lewat file baru di `migrations/` dengan format `000X_deskripsi_singkat.sql`, dijalankan berurutan oleh `npm run db:migrate` (dicatat di `schema_migrations`).
- **Jangan pernah mengedit atau me-rename migrasi yang sudah ada.** Koreksi dibuat sebagai migrasi baru. Ada dua file berawalan `0008` (`0008_add_transaksi_edited_at.sql` dan `0008_transaction_edit_timestamp.sql`); keduanya disengaja dan aman dijalankan berurutan.
- Migrasi harus idempoten bila memungkinkan (lihat pola `information_schema` di `0008`/`0009`).
- Jangan ubah skema production lewat CLI/phpMyAdmin.

### Timezone (kontrak)
- Semua kolom `DATETIME` disimpan **UTC** (`YYYY-MM-DD HH:mm:ss`). Ditampilkan sebagai **WIB (Asia/Jakarta)**.
- `src/lib/datetime.ts` adalah satu-satunya batas konversi (`utcSqlToIso`, `jakartaDateToUtcSql`, `nowUtcSql`, `todayJakarta`, dll).
- `src/lib/db.ts` memakai `dateStrings: true`. Jangan `new Date("YYYY-MM-DD HH:mm:ss")` langsung pada nilai DATETIME.
- Filter tanggal dari UI adalah tanggal WIB, dikonversi ke UTC sebelum query.

## Data Model Inti
- **`users`**: id (CHAR 36), username unik, password_hash (bcrypt), nama_lengkap, role (`kasir`/`admin`), aktif, session_version.
- **`jenis_kendaraan`**: kategori + ukuran (unik berpasangan), tarif_default, jatah_karyawan, jatah_pemilik, aktif. CHECK: jatah_karyawan + jatah_pemilik = tarif_default.
- **`transaksi`**: tanggal_waktu (UTC), jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id, created_at, edited_at (DATETIME(6)). CHECK: jatah karyawan + pemilik = total.
- **`mobile_sessions`**: refresh token (hash), expires_at, revoked_at, last_activity_at.
- **`activity_logs`**: jejak audit (aksi, entitas, old/new value JSON, IP, user agent). Retensi default 90 hari (`ACTIVITY_LOG_RETENTION_DAYS`).
- **`app_settings`**: key-value pengaturan aplikasi.

**Penting:** nilai tarif dan pembagian di `transaksi` adalah **snapshot**. Jangan hitung ulang transaksi lama dengan tarif master terbaru, kecuali dalam proses edit transaksi yang eksplisit. Mobile API selalu mengambil nominal dari database, bukan dari klien.

## Aturan Perilaku Penting
- **Log aktivitas**: setiap mutasi admin (CREATE/UPDATE/DELETE/EXPORT/PRINT, login/logout) dicatat lewat `logActivity` (`src/lib/activityLog.ts`). Nilai `ActivityAction` harus sinkron dengan ENUM di migrasi. Kegagalan log tidak boleh menggagalkan aksi utama.
- **Edit transaksi** memakai optimistic concurrency: klien mengirim `expectedEditedAt`; server menolak bila `edited_at` sudah berubah. Pertahankan pola ini.
- **Idempotency mobile**: `clientTransactionId` (UUID dari Android) dipakai sebagai ID transaksi. Retry dengan payload sama mengembalikan `duplicate: true`; payload berbeda mengembalikan `IDEMPOTENCY_CONFLICT`. Waktu transaksi adalah waktu kasir menekan simpan, bukan waktu sinkronisasi.
- **Respons API mobile** memakai `jsonOk` / `jsonError` dengan kode error yang terdaftar di `MOBILE_API.md`. Jangan bocorkan detail internal di pesan error.
- **Restore backup JSON** bersifat atomik (semua batch commit atau rollback) dan melewati `validateTransactionBackup`. Jangan longgarkan validasinya.

## Dashboard & Rekap
Prioritaskan informasi yang membantu owner memahami kondisi usaha. Minimal: pendapatan kotor, pendapatan bersih/jatah pemilik, total transaksi, rata-rata per hari, breakdown karyawan vs pemilik. Filter: rentang tanggal kustom, harian, mingguan, bulanan. Timezone bisnis selalu WIB.

## Konvensi Kerja
- Teks UI dan pesan error untuk pengguna: **Bahasa Indonesia**. Kode, nama fungsi, dan komentar teknis boleh Inggris atau Indonesia, ikuti file di sekitarnya.
- Tanpa placeholder atau stub code. Tanpa dependency baru kecuali benar-benar perlu (jelaskan alasannya).
- File di repo memakai line ending **CRLF**. Pertahankan agar diff tidak berantakan.
- Perubahan kecil dan terfokus, satu commit per tujuan. Jangan campur refactor dengan perubahan perilaku.
- Sebelum merge jalankan:
  ```bash
  npm run check   # eslint + tsc + tes
  npm run build
  ```
- Alur: kerjakan di `develop` (staging), uji, baru merge ke `main` (production). Migrasi dijalankan dengan `npm run db:migrate` di tiap environment.
- Perintah bantu: `npm run db:create-admin -- admin "password" "Nama Admin"`, `npm run db:seed-demo`, `npm run bundle`.
- Perubahan logika bisnis atau keamanan sebaiknya disertai tes di `tests/`.