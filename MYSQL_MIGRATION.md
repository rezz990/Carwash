# Migrasi Carwash Admin: Supabase/PostgreSQL -> MySQL/MariaDB

## 1. Local XAMPP

1. Start **Apache** dan **MySQL/MariaDB** di XAMPP.
2. Buat database kosong bernama `carwash` di phpMyAdmin.
3. Copy `.env.local.example` menjadi `.env.local`.
4. Pastikan:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/carwash"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="isi-secret-random-panjang"
```

5. Install dependency:

```bash
npm install
```

6. Jalankan schema:

```bash
npm run db:migrate
```

7. Buat admin lokal jika tidak mengimpor user Supabase:

```bash
npm run db:create-admin -- admin password123 "Administrator"
```

8. Jalankan aplikasi:

```bash
npm run dev
```

## 2. Migrasi data dari Supabase

**Disarankan menggunakan `SUPABASE_DB_URL`**, bukan REST API, karena migration perlu membaca `auth.users.encrypted_password` agar password lama tetap bisa dipakai.

Tambahkan sementara ke environment:

```env
SUPABASE_DB_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
```

Lalu:

```bash
npm run migrate-data
```

Script akan memindahkan:

- `auth.users.encrypted_password` + `profiles` -> `users`
- `jenis_kendaraan`
- `transaksi`
- UUID dan timestamp tetap dipertahankan

Setelah selesai, hapus `SUPABASE_DB_URL` dari environment aplikasi.

## 3. Kontrak timezone

Database MySQL/MariaDB menyimpan `DATETIME` dalam **UTC**.

Contoh:

- WIB `2026-08-14 07:00:00`
- DB `2026-08-14 00:00:00`

Aplikasi menggunakan `src/lib/datetime.ts` untuk mengubah filter tanggal WIB menjadi batas UTC. Jangan mengandalkan timezone server hosting.

## 4. Production

- Gunakan user database khusus aplikasi, jangan `root`.
- Beri user hanya permission database `carwash` yang dibutuhkan.
- Gunakan password database yang kuat.
- Set `NEXTAUTH_SECRET` random dan panjang.
- Jangan commit `.env.local`.
- Setelah migrasi selesai, cabut/rotasi credential Supabase yang pernah dipakai untuk migration.
- Jalankan `npm run db:migrate` terhadap database production sebelum deploy aplikasi.

## Catatan penting untuk `npm run db:*`

Script CLI dijalankan oleh `tsx`, bukan oleh Next.js. Karena itu `.env.local` tidak otomatis dimuat seperti saat `next dev`. Project ini menyediakan `scripts/load-env.ts` dan setiap script database memuat helper tersebut.

Pastikan `.env.local` berada di **root project**, satu level dengan `package.json`:

```text
carwash-final/
├── .env.local
├── package.json
├── migrations/
└── scripts/
```

Contoh untuk XAMPP:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/carwash"
```

Jika root MySQL XAMPP diberi password, gunakan password tersebut, misalnya:

```env
DATABASE_URL="mysql://root:password_mysql@127.0.0.1:3306/carwash"
```

Jika password mengandung karakter khusus seperti `@`, `#`, `:` atau `/`, URL-encode password tersebut.
