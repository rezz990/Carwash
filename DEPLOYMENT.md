# Deployment staging di cPanel

Panduan ini memakai `develop` untuk staging di `https://dev.bujon.my.id` dan `main` untuk production di `https://app.bujon.my.id`.

## 1. Pisahkan staging dari production

Buat resource khusus staging:

- subdomain dan SSL `dev.bujon.my.id`;
- direktori aplikasi, misalnya `/home/USER/dev.bujon.my.id`;
- database dan user MySQL khusus staging;
- `NEXTAUTH_SECRET` dan `MOBILE_API_SECRET` khusus staging.

Jangan arahkan staging ke database production. Dengan begitu migrasi, reset data, dan pengujian fitur tidak menyentuh transaksi nyata.

## 2. Environment variables

Isi melalui halaman **Setup Node.js App** cPanel:

```env
DATABASE_URL=mysql://DB_USER:URL_ENCODED_PASSWORD@localhost:3306/DB_NAME
NEXTAUTH_URL=https://dev.bujon.my.id
NEXTAUTH_SECRET=RANDOM_SECRET_MINIMAL_32_KARAKTER
MOBILE_API_SECRET=RANDOM_SECRET_LAIN_MINIMAL_32_KARAKTER
NODE_ENV=production
```

`NEXTAUTH_URL` wajib memakai `https://`. Nilai `dev.bujon.my.id` tanpa skema dapat membuat login berhasil tetapi redirect kembali ke dashboard gagal.

Password database di dalam URL harus di-encode. Karakter seperti `?`, `#`, `@`, `:`, `/`, dan `%` tidak boleh ditempel langsung. Cara aman membuat nilainya tanpa menampilkan password di command history:

```bash
python3 -c 'import getpass,urllib.parse; print(urllib.parse.quote(getpass.getpass("DB password: "), safe=""))'
```

Masukkan hasilnya sebagai bagian `URL_ENCODED_PASSWORD`. Contoh: password `abc@123?` menjadi `abc%40123%3F`.

## 3. Ambil kode staging

Di terminal cPanel:

```bash
cd ~/dev.bujon.my.id
git fetch origin
git switch develop
git pull --ff-only origin develop
```

Jika direktori belum berisi repository, clone branch staging terlebih dahulu:

```bash
git clone --branch develop https://github.com/rezz990/Carwash.git ~/dev.bujon.my.id
```

## 4. Pasang dependency dengan Node.js Selector

Pilih Node.js 20 di **Setup Node.js App**, lalu klik **Run NPM Install**. CloudLinux mengelola `node_modules` sebagai symlink ke virtual environment, sehingga jangan menyalin `node_modules` dari production dan jangan mengganti symlink tersebut.

Gunakan konfigurasi aplikasi berikut:

- **Application root:** direktori repository staging;
- **Application URL:** `dev.bujon.my.id`;
- **Application startup file:** `server.js`;
- **Application mode:** Production setelah proses build selesai.

`tsx` berada di dependency runtime agar perintah migrasi tersedia pada mode production. Verifikasi dari terminal yang sudah mengaktifkan environment Node cPanel:

```bash
./node_modules/.bin/tsx --version
```

Jika dependency build seperti TypeScript belum tersedia, ubah **Application mode** sementara ke Development, jalankan **Run NPM Install**, lakukan build, lalu kembalikan ke Production.

## 5. Migrasi, build, dan restart

Ambil backup database staging terlebih dahulu. Jalankan langkah berikut secara berurutan:

```bash
npm run db:migrate
npm run build
```

Admin pertama hanya perlu dibuat pada database kosong:

```bash
npm run db:create-admin -- dev_admin "password-kuat" "Development Admin"
```

Setelah build berhasil, klik **Restart Application** di cPanel. Jangan restart sebelum migrasi selesai karena kode terbaru membutuhkan kolom skema terbaru.

## 6. Verifikasi setelah restart

1. Buka `https://dev.bujon.my.id/api/health`. Respons normal berstatus `200` dengan `database: "connected"`.
2. Login melalui jendela incognito.
3. Pastikan Overview, Rekap, Tarif, User, Pengaturan, dan Log dapat dibuka.
4. Buat satu transaksi uji dari aplikasi kasir staging dan pastikan notifikasi serta rekap berubah.
5. Ubah timeout staging menjadi 5 menit, diamkan tanpa sentuhan lebih dari 5 menit, lalu fokuskan kembali tab. Halaman harus kembali ke login.
6. Uji tab ditutup: login, tutup tab selama lebih dari timeout, lalu buka kembali URL admin. Akses harus ditolak.

## 7. Alur branch

- Perubahan dibuat melalui feature branch dan pull request ke `develop`.
- `develop` dideploy ke subdomain staging untuk pengujian klien.
- Setelah diterima, buat pull request `develop` ke `main`.
- `main` hanya dideploy ke production setelah backup database dan quality checks lulus.

Jangan melakukan perubahan langsung di direktori server. Perubahan akan hilang atau menimbulkan konflik pada pull berikutnya.

## Pemecahan masalah

### `sh: tsx: command not found`

Jalankan **Run NPM Install** lagi setelah menarik versi terbaru. Pastikan `./node_modules/.bin/tsx --version` berhasil. Jangan menyalin folder `node_modules` dari aplikasi lain.

### `getaddrinfo ENOTFOUND` dengan nama user database sebagai hostname

`DATABASE_URL` salah diparse, biasanya karena password berisi karakter khusus yang belum di-encode. Encode password lalu simpan ulang environment variable dan restart aplikasi.

### Login sukses tetapi tidak masuk dashboard

Pastikan `NEXTAUTH_URL` sama persis dengan URL publik dan menyertakan `https://`. Hapus cookie situs, restart aplikasi, lalu coba lagi melalui incognito.

### Health check berstatus 503

Periksa nama database, user, password ter-encode, izin user database, dan host MySQL. Jalankan `npm run db:migrate` setelah koneksi berhasil.
