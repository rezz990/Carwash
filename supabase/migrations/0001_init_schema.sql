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
-- Split jatah karyawan/pemilik NOMINAL TETAP per kategori kendaraan
-- (bukan persentase global) — berdasarkan data rekap aktual.
create table public.jenis_kendaraan (
  id uuid primary key default gen_random_uuid(),
  kategori text not null,        -- "Motor" / "Mobil"
  ukuran text not null,          -- "Kecil" / "Sedang" / "Besar"
  tarif_default numeric(10,2) not null default 0,
  jatah_karyawan numeric(10,2) not null default 0,
  jatah_pemilik numeric(10,2) not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kategori, ukuran),
  check (jatah_karyawan + jatah_pemilik = tarif_default)
);

-- Seed data awal berdasarkan data rekap aktual (Juli)
insert into public.jenis_kendaraan (kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik) values
  ('Motor', 'Kecil', 15000, 7000, 8000),
  ('Motor', 'Besar', 20000, 7000, 13000),
  ('Mobil', 'Kecil', 30000, 13000, 17000),
  ('Mobil', 'Sedang', 35000, 13000, 22000),
  ('Mobil', 'Besar', 40000, 15000, 25000);

-- ---------------------------------------------------------
-- 3. TABEL TRANSAKSI
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
-- CATATAN PENTING:
-- 1. Tarif & split jatah karyawan/pemilik SUDAH final berdasarkan data
--    rekap aktual (bukan asumsi lagi). Split berupa NOMINAL TETAP per
--    kategori kendaraan, disimpan langsung di kolom jatah_karyawan/
--    jatah_pemilik pada tabel jenis_kendaraan (bukan tabel/persentase
--    terpisah).
-- 2. plat_nomor sengaja dibuat NULLABLE - konfirmasi ke owner apakah wajib.
-- 3. Role pertama kali admin harus di-set manual lewat SQL Editor:
--    update public.profiles set role = 'admin' where username = 'USERNAME_ADMIN';
-- 4. AUTH: aplikasi wajib convert username jadi email format
--    {username}@carwash.internal sebelum panggil Supabase Auth
--    (signInWithPassword / admin.createUser). Domain ini cuma format,
--    tidak perlu bisa menerima email asli. Lihat AGENTS.md bagian
--    "Auth Strategy" untuk detail lengkap.
-- =========================================================