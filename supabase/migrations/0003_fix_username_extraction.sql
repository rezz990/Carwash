-- =========================================================
-- MIGRATION: 0003_fix_username_extraction
-- Trigger handle_new_user() versi lama menyimpan email penuh
-- (kasir1@carwash.internal) ke kolom username, bukan extract
-- bagian sebelum '@' saja. Fix trigger + backfill data lama.
--
-- Cara pakai: npx supabase db push
-- =========================================================

-- 1. Update ulang fungsi trigger (pastikan pakai split_part)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, role)
  values (new.id, split_part(new.email, '@', 1), 'kasir');
  return new;
end;
$$;

-- 2. Backfill: perbaiki username yang sudah terlanjur tersimpan sebagai
-- email penuh (kasus lama sebelum trigger di-fix). Hanya update baris yang
-- username-nya masih mengandung '@carwash.internal'.
update public.profiles
set username = split_part(username, '@', 1)
where username like '%@carwash.internal';

-- Cek hasil backfill
select id, username, role from public.profiles;