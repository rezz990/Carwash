# Carwash Kasir Mobile API

Android tidak terhubung langsung ke MySQL/MariaDB. Android memakai HTTPS API Next.js.

## Base URL

- Production: gunakan HTTPS. https://app.bujon.my.id/

## Auth
### POST `/api/mobile/auth/login`
```json
{"username":"","password":""}
```
Mengembalikan `accessToken` 15 menit dan `refreshToken` 30 hari. Request protected memakai `Authorization: Bearer <accessToken>`.

### POST `/api/mobile/auth/refresh`
```json
{"refreshToken":"..."}
```
Refresh token di-rotate dan token lama direvoke.

### POST `/api/mobile/auth/logout`
```json
{"refreshToken":"..."}
```
Merevoke refresh session.

### GET `/api/mobile/me`
Mengembalikan user aktif.

## Master data
### GET `/api/mobile/vehicles`
Mengembalikan kendaraan aktif beserta tarif, jatah karyawan, dan jatah pemilik dari database.

## Transaksi
### POST `/api/mobile/transactions`
```json
{"jenisKendaraanId":"uuid","platNomor":"D1234ABC"}
```
`tanggalWaktu` opsional ISO-8601. Backend selalu mengambil nominal tarif/pembagian dari database dan menyimpan transaksi dalam UTC.

### GET `/api/mobile/transactions`
Query: `page`, `limit`, `from`, `to`, `search`, `jenisKendaraanId`. `from`/`to` adalah tanggal WIB (`YYYY-MM-DD`). Kasir hanya melihat transaksi miliknya.

### GET `/api/mobile/transactions/check-plate?plate=D1234ABC`
Pengecekan UX; validasi final tetap dilakukan pada POST transaksi.

### GET `/api/mobile/transactions/:id`
Detail transaksi milik kasir yang sedang login.

## Error
```json
{"success":false,"error":{"code":"INVALID_CREDENTIALS","message":"Username atau password salah"}}
```

Kode utama: `UNAUTHORIZED`, `INVALID_TOKEN`, `INVALID_REFRESH_TOKEN`, `ACCOUNT_DISABLED`, `ROLE_NOT_ALLOWED`, `INVALID_CREDENTIALS`, `INVALID_INPUT`, `INVALID_PLATE`, `VEHICLE_NOT_FOUND`, `DUPLICATE_PLATE`, `INVALID_TARIFF_CONFIG`, `NOT_FOUND`, `TOO_MANY_ATTEMPTS`, `INTERNAL_ERROR`.

## Security
Jangan pernah memasukkan `DATABASE_URL`, password MySQL, `NEXTAUTH_SECRET`, atau `MOBILE_API_SECRET` ke APK. Android hanya membutuhkan URL API. Production wajib HTTPS.
