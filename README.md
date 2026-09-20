# Bujon Carwash

Dashboard operasional carwash berbasis Next.js 16, MySQL/MariaDB, dan NextAuth. Antarmuka admin dioptimalkan untuk penggunaan harian melalui ponsel, sementara API mobile melayani aplikasi kasir.

## Fitur utama

- Overview pendapatan, transaksi, kasir aktif, dan grafik periode.
- Rekap harian dan detail transaksi dengan filter, pencarian, koreksi, serta ekspor Excel/PDF.
- Pengelolaan tarif, pembagian karyawan/pemilik, user, dan hak akses.
- Logout otomatis berbasis aktivitas yang tetap berlaku setelah tab ditutup atau browser berada di latar belakang.
- Log aktivitas, notifikasi transaksi lewat SSE, dan salinan transaksi JSON.
- API mobile dengan access/refresh token.

## Menjalankan secara lokal

Persyaratan: Node.js 20+, MySQL 8+ atau MariaDB 10.4+.

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:create-admin -- admin "password-kuat" "Administrator"
npm run dev
```

Buka `http://localhost:3000`. Semua `DATETIME` di database disimpan sebagai UTC dan ditampilkan sebagai WIB (`Asia/Jakarta`).

## Pemeriksaan sebelum merge

```bash
npm run check
npm run build
```

`npm run check` menjalankan ESLint, TypeScript, dan tes perilaku. GitHub Actions menjalankan pemeriksaan yang sama pada push ke `main`/`develop` dan setiap pull request.

## Database

Migrasi di `migrations/` adalah sumber kebenaran skema dan dijalankan berurutan oleh:

```bash
npm run db:migrate
```

Jangan mengubah tabel production secara manual tanpa migrasi. Panduan migrasi lama dari Supabase tersedia di [MYSQL_MIGRATION.md](./MYSQL_MIGRATION.md).

## Deployment

Gunakan database, secret, dan domain terpisah untuk staging. Panduan cPanel dan `dev.bujon.my.id` tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).

Log aktivitas disimpan selama 90 hari secara default. Atur `ACTIVITY_LOG_RETENTION_DAYS` bila masa retensi perlu diubah.
