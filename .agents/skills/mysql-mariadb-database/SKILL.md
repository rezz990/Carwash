1. **Schema Database**  
   - Konversi semua file `.sql` di `migrations/` ke sintaks MySQL.  
   - Tipe data:  
     - `UUID` → `CHAR(36)` dengan `DEFAULT (UUID())`  
     - `JSONB` → `JSON`  
     - `TIMESTAMPTZ` → `DATETIME` (simpan UTC, handle timezone di aplikasi)  
     - `TEXT[]` / array → gunakan `JSON` atau buat tabel relasi terpisah  
     - `SERIAL` → `INT AUTO_INCREMENT`  
     - `BOOLEAN` → `TINYINT(1)`  

2. **Kode Backend**  
   - Ganti semua import `@supabase/supabase-js` dengan `mysql2/promise`.  
   - Buat file `lib/db.ts` sebagai pool koneksi.  
   - Ubah query supabase (`.select()`, `.eq()`, dll) menjadi raw SQL parameterized (gunakan `?` placeholder).  
   - Jika pakai Prisma, update `schema.prisma` provider ke `mysql`.

3. **Auth & RLS Sederhana**  
   - Hapus semua ketergantungan Supabase Auth.  
   - Gunakan **NextAuth.js** dengan credentials provider (email + password).  
   - Simpan user di tabel `users` dengan kolom: `id`, `email`, `password_hash`, `role` (ENUM: 'admin','kasir').  
   - RLS diganti dengan **middleware Next.js** yang mengecek session dan role di setiap request ke `/api/*` dan halaman tertentu.  
   - Contoh guard:  
     ```typescript
     // middleware.ts
     if (pathname.startsWith('/admin') && user.role !== 'admin') return redirect('/unauthorized');