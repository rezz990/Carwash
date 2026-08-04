-- =========================================================
-- MIGRATION: 0001_init_schema
-- POS Steam Cuci Kendaraan — schema awal
--
-- Cara pakai:
--   1. Install Supabase CLI kalau belum ada
--   2. npx supabase link --project-ref <project-ref-dari-dashboard>
--   3. npx supabase db push
--
-- JANGAN edit file ini lagi setelah pernah di-push ke database.
-- Untuk perubahan schema selanjutnya, buat file migration baru:
-- supabase/migrations/0002_nama_perubahan.sql
-- =========================================================

-- Ekstensi buat generate UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. TABEL PROFILES (extend auth.users bawaan Supabase)
-- ---------------------------------------------------------
-- Supabase Auth udah handle username/password lewat auth.users,
-- tabel ini nyimpen data tambahan: nama, role.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nama_lengkap text,
  role text not null default 'kasir' check (role in ('kasir', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. TABEL JENIS KENDARAAN (master data, admin bisa CRUD)
-- ---------------------------------------------------------
create table public.jenis_kendaraan (
  id uuid primary key default gen_random_uuid(),
  kategori text not null,        -- "Motor" / "Mobil"
  ukuran text not null,          -- "Kecil" / "Sedang" / "Besar"
  tarif_default numeric(10,2) not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kategori, ukuran)
);

-- Seed data awal sesuai catatan bos (harga masih 0, isi manual nanti)
insert into public.jenis_kendaraan (kategori, ukuran, tarif_default) values
  ('Motor', 'Kecil', 0),
  ('Motor', 'Besar', 0),
  ('Mobil', 'Kecil', 0),
  ('Mobil', 'Sedang', 0),
  ('Mobil', 'Besar', 0);

-- ---------------------------------------------------------
-- 3. TABEL KONFIGURASI SPLIT TARIF (admin bisa atur)
-- ---------------------------------------------------------
-- Skema split masih perlu dikonfirmasi ke owner (persen atau nominal tetap).
-- Default: persentase. Kalau ternyata nominal tetap, ganti pendekatan kolom.
create table public.konfigurasi_split (
  id uuid primary key default gen_random_uuid(),
  persen_karyawan numeric(5,2) not null default 30.00,
  persen_pemilik numeric(5,2) not null default 70.00,
  berlaku_sejak timestamptz not null default now(),
  check (persen_karyawan + persen_pemilik = 100)
);

insert into public.konfigurasi_split (persen_karyawan, persen_pemilik)
values (30.00, 70.00);

-- ---------------------------------------------------------
-- 4. TABEL TRANSAKSI
-- ---------------------------------------------------------
create table public.transaksi (
  id uuid primary key default gen_random_uuid(),
  tanggal_waktu timestamptz not null default now(),  -- otomatis, jangan input manual
  jenis_kendaraan_id uuid not null references public.jenis_kendaraan(id),
  plat_nomor text,
  tarif_total numeric(10,2) not null,
  tarif_jatah_karyawan numeric(10,2) not null,
  tarif_jatah_pemilik numeric(10,2) not null,
  kasir_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Index buat filter by date (rekap harian/mingguan/bulanan) & jenis kendaraan
create index idx_transaksi_tanggal on public.transaksi (tanggal_waktu);
create index idx_transaksi_jenis on public.transaksi (jenis_kendaraan_id);
create index idx_transaksi_kasir on public.transaksi (kasir_id);

-- ---------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.jenis_kendaraan enable row level security;
alter table public.konfigurasi_split enable row level security;
alter table public.transaksi enable row level security;

-- Helper function: cek role user yang lagi login
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- PROFILES: semua user login bisa liat semua profile (buat filter "kasir mana"),
-- tapi cuma admin yang bisa insert/update/delete
create policy "profiles_select_all" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_admin_manage" on public.profiles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- JENIS_KENDARAAN: semua user login bisa liat (buat pilih pas input transaksi),
-- cuma admin yang bisa ubah tarif/tambah kategori
create policy "jenis_kendaraan_select_all" on public.jenis_kendaraan
  for select using (auth.uid() is not null);

create policy "jenis_kendaraan_admin_manage" on public.jenis_kendaraan
  for insert with check (public.current_user_role() = 'admin');

create policy "jenis_kendaraan_admin_update" on public.jenis_kendaraan
  for update using (public.current_user_role() = 'admin');

create policy "jenis_kendaraan_admin_delete" on public.jenis_kendaraan
  for delete using (public.current_user_role() = 'admin');

-- KONFIGURASI_SPLIT: semua bisa baca (buat hitung split pas input transaksi),
-- cuma admin yang bisa ubah
create policy "konfigurasi_split_select_all" on public.konfigurasi_split
  for select using (auth.uid() is not null);

create policy "konfigurasi_split_admin_manage" on public.konfigurasi_split
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- TRANSAKSI: semua user login (kasir & admin) bisa liat SEMUA transaksi
-- (sesuai request: kasir juga bisa rekap semua history, bukan cuma miliknya)
create policy "transaksi_select_all" on public.transaksi
  for select using (auth.uid() is not null);

-- Kasir & admin bisa input transaksi baru, tapi kasir_id harus sesuai user
-- yang login (ga bisa input atas nama kasir lain)
create policy "transaksi_insert_own" on public.transaksi
  for insert with check (kasir_id = auth.uid());

-- Cuma admin yang bisa update/hapus transaksi (koreksi salah input)
create policy "transaksi_admin_update" on public.transaksi
  for update using (public.current_user_role() = 'admin');

create policy "transaksi_admin_delete" on public.transaksi
  for delete using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------
-- 6. TRIGGER: auto-buat profile pas ada user baru daftar
-- ---------------------------------------------------------
-- Username asli di-extract dari bagian sebelum "@" di email.
-- App wajib kirim email dengan format {username}@carwash.internal saat
-- signup/createUser, supaya trigger ini bisa extract username dengan benar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, role)
  values (new.id, split_part(new.email, '@', 1), 'kasir');  -- default role kasir, admin ubah manual
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- CATATAN PENTING (jangan lupa follow up ke owner):
-- 1. Skema split tarif di atas pakai PERSENTASE (30/70 default).
--    Kalau ternyata owner maunya NOMINAL TETAP per transaksi, ganti kolom
--    konfigurasi_split jadi nominal_karyawan/nominal_pemilik dan sesuaikan
--    cara hitung tarif_jatah_* di aplikasi.
-- 2. tarif_default di jenis_kendaraan masih 0 - isi manual lewat Supabase
--    Table Editor atau lewat UI admin setelah app jadi.
-- 3. plat_nomor sengaja dibuat NULLABLE - konfirmasi ke owner apakah wajib.
-- 4. Role pertama kali admin harus di-set manual lewat SQL Editor:
--    update public.profiles set role = 'admin' where username = 'USERNAME_ADMIN';
-- 5. AUTH: aplikasi wajib convert username jadi email format
--    {username}@carwash.internal sebelum panggil Supabase Auth
--    (signInWithPassword / admin.createUser). Domain ini cuma format,
--    tidak perlu bisa menerima email asli. Lihat AGENTS.md bagian
--    "Auth Strategy" untuk detail lengkap.
-- =========================================================
