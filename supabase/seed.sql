-- =========================================================
-- SEED DATA: POS Steam Cuci Kendaraan
-- File ini untuk data TESTING/development saja, bukan data production asli.
-- Jalankan di Supabase SQL Editor, ATAU taruh sebagai supabase/seed.sql
-- supaya otomatis jalan tiap kali `npx supabase db reset`.
-- =========================================================

-- ---------------------------------------------------------
-- BAGIAN A — aman dijalankan langsung, tidak butuh setup tambahan
-- ---------------------------------------------------------

-- Isi tarif dummy untuk testing (harga ASLI masih perlu dikonfirmasi,
-- ganti angka-angka ini nanti setelah dapat data harga sebenarnya)
update public.jenis_kendaraan set tarif_default = 15000 where kategori = 'Motor' and ukuran = 'Kecil';
update public.jenis_kendaraan set tarif_default = 20000 where kategori = 'Motor' and ukuran = 'Besar';
update public.jenis_kendaraan set tarif_default = 35000 where kategori = 'Mobil' and ukuran = 'Kecil';
update public.jenis_kendaraan set tarif_default = 45000 where kategori = 'Mobil' and ukuran = 'Sedang';
update public.jenis_kendaraan set tarif_default = 60000 where kategori = 'Mobil' and ukuran = 'Besar';

-- konfigurasi_split sudah ada default 30/70 dari migration, tidak perlu diubah
-- kecuali mau coba skema split yang berbeda untuk testing:
-- update public.konfigurasi_split set persen_karyawan = 30.00, persen_pemilik = 70.00;

-- ---------------------------------------------------------
-- BAGIAN B — jalankan SETELAH bikin akun test manual
-- ---------------------------------------------------------
-- Langkah manual dulu (bikin akun user test via dashboard, bukan SQL,
-- karena insert langsung ke auth.users itu rawan berbeda antar versi Supabase):
--
-- 1. Buka Supabase Dashboard → Authentication → Users → "Add user"
-- 2. Bikin 2 akun test:
--    - Email: kasir1@carwash.internal | Password: test1234 | Auto Confirm: ON
--    - Email: admin1@carwash.internal | Password: test1234 | Auto Confirm: ON
-- 3. Jadiin akun kedua sebagai admin:
update public.profiles set role = 'admin' where username = 'admin1';
--
-- 4. Baru jalankan insert transaksi test di bawah ini (subquery otomatis
--    cari id user berdasarkan username, jadi tidak perlu tau UUID manual)

insert into public.transaksi
  (tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id)
select
  now() - interval '2 hours',
  (select id from public.jenis_kendaraan where kategori = 'Motor' and ukuran = 'Kecil'),
  'D 1234 ABC',
  15000,
  4500,   -- 30% dari 15000
  10500,  -- 70% dari 15000
  (select id from public.profiles where username = 'kasir1');

insert into public.transaksi
  (tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id)
select
  now() - interval '1 hour',
  (select id from public.jenis_kendaraan where kategori = 'Mobil' and ukuran = 'Sedang'),
  'D 5678 XYZ',
  45000,
  13500,  -- 30% dari 45000
  31500,  -- 70% dari 45000
  (select id from public.profiles where username = 'kasir1');

insert into public.transaksi
  (tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id)
select
  now() - interval '1 day',
  (select id from public.jenis_kendaraan where kategori = 'Mobil' and ukuran = 'Besar'),
  'D 9999 ZZZ',
  60000,
  18000,  -- 30% dari 60000
  42000,  -- 70% dari 60000
  (select id from public.profiles where username = 'kasir1');

-- =========================================================
-- CATATAN:
-- - Semua angka tarif di file ini masih DUMMY, bukan harga asli usaha.
-- - kasir_id di 3 transaksi contoh sengaja pakai user yang sama ('kasir1')
--   supaya gampang dites. Boleh diduplikasi baris insert-nya kalau mau
--   test dengan beberapa kasir berbeda.
-- - Setelah selesai testing, hapus data ini sebelum masuk production:
--   truncate table public.transaksi;
-- =========================================================