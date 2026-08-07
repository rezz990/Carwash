-- =========================================================
-- MIGRATION: 0002_add_profiles_aktif
-- Tambah kolom aktif di profiles untuk nonaktifkan user tanpa hapus
-- (menghapus akan merusak relasi kasir_id di data transaksi lama)
--
-- Cara pakai: npx supabase db push
-- =========================================================

alter table public.profiles
  add column aktif boolean not null default true;