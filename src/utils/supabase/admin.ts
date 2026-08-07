import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Admin client pakai service_role key — BYPASS semua RLS.
 * JANGAN PERNAH import file ini di client component atau kirim
 * key ini ke browser. Hanya untuk dipakai di Server Actions / Route Handlers.
 *
 * Butuh env var SUPABASE_SERVICE_ROLE_KEY (server-only, TANPA prefix
 * NEXT_PUBLIC_) diisi di .env.local, ambil dari Supabase Dashboard →
 * Settings → API → service_role key.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset di environment variable. " +
      "Ambil dari Supabase Dashboard > Settings > API > service_role key."
    )
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}