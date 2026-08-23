---
trigger: always_on
---

# 🎨 Guideline UI/UX

## 1. Warna Palette
**Primary (Aksen):**
- Yellow-400 `#FACC15` → CTA, badge, highlight
- Yellow-500 `#EAB308` → Hover state, active
- Yellow-600 `#CA8A04` → Pressed state

**Neutral (Dasar):**
- Slate-900 `#0F172A` → Heading, teks utama
- Slate-800 `#1E293B` → Card header, secondary text
- Slate-500 `#64748B` → Placeholder, caption, muted text
- Slate-200 `#E2E8F0` → Border, divider
- Slate-100 `#F1F5F9` → Background halus
- White `#FFFFFF` → Card background, surface

**Semantic:**
- Red-500 → Error, delete, warning
- Green-500 → Success, active, income
- Blue-500 → Info, link

**Aturan warna:**
- Background halaman: `bg-slate-50` atau `bg-slate-100`
- Card/surface: `bg-white` + `border border-slate-200/80` + `shadow-sm`
- Jangan pakai warna yang nggak ada di palette tanpa izin.
- Jangan pakai gradient sembarangan. Kalau mau gradient, izin dulu.

## 2. Tipografi & Font
**Font Family:**
`font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

**Scale Tipografi:**
- Page Title: `text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight`
- Card Title: `text-lg font-semibold text-slate-800 normal`
- Body: `text-sm sm:text-base font-normal text-slate-600 normal`
- Caption: `text-xs sm:text-sm font-medium text-slate-500 normal`
- Price/Number: `text-lg font-bold text-slate-900 tabular-nums`

**Aturan penting:**
- Angka harga & statistik WAJIB pakai `tabular-nums`.
- Heading jangan terlalu banyak. Max 2 level per halaman.
- Line height: `leading-relaxed` buat body text, `leading-snug` buat heading.

## 3. Spacing & Layout
- Padding halaman: `p-4 sm:p-6 lg:p-8` (mobile dulu!)
- Gap antar card: `gap-4` atau `gap-6`
- Card padding: `p-4 sm:p-5`
- Border radius: `rounded-xl` buat card, `rounded-lg` buat button/input, `rounded-full` buat avatar/badge.
- Max width konten: `max-w-7xl mx-auto`

## 4. Komponen UI (Pake yang Udah Ada!)
Cek dulu di `src/components/ui/` (Button.tsx, Input.tsx, Card.tsx, Skeleton.tsx). Jangan bikin komponen baru kalau yang udah ada cukup.

## 5. Micro-interactions & Animasi
- **Hover:** Button `hover:scale-[1.02] hover:shadow-md`, Card `hover:border-yellow-400/50 hover:shadow-md`
- **Active/Pressed:** Button `active:scale-[0.98]`
- **Focus:** Input `focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-500`
- **Loading:** Button loading ada spinner, Page loading pakai Skeleton/loading.tsx. Data refresh pakai badge "Memperbarui..." + skeleton overlay.
- **Animasi halus (Framer Motion):** FadeIn, StaggerContainer, Modal `scale: 0.95 -> 1`, Toast slide dari kanan atas.

# 💻 Guideline Kode

## 1. Struktur Folder
- Server Action taruh di `actions.ts` di dalam folder route-nya.
- Jangan taruh business logic di komponen UI. Pisah ke action/helper.
- Query database pakai `mysql2/promise` dengan parameterized query. JANGAN string concatenation buat SQL.

## 2. Naming Convention
- Komponen: PascalCase
- Hooks: camelCase dengan prefix use
- Utils/Helpers: camelCase
- Server Actions: camelCase
- Types/Interfaces: PascalCase
- File CSS/Module: kebab-case

## 3. TypeScript
Jangan pakai `any`. Bikin type atau interface. Return type server action harus jelas. Props komponen harus ada interface-nya.

## 4. Error Handling
- Server Action: selalu return `{ error?: string, ...data }`.
- Client: cek error dulu sebelum render data.
- Toast error bahasa santai.

## 5. Form & Input
Validasi pakai Zod. Error message di bawah input, warna red-500, font size text-xs. Submit button disabled kalau form invalid atau loading.

# 🗣️ Guideline Bahasa & Nada
- **Bahasa Indonesia (Santai):** Teks UI pakai bahasa santai dan friendly.
- **Microcopy:** Placeholder kasih contoh, empty state kasih ilustrasi + teks + CTA, tooltip jelaskan fungsi.

# 🔄 Alur Kerja Bareng AI
- Tanya konteks (admin, mobile/web).
- Saranin approach paling simpel.
- Bikin skema DB -> Server Action -> UI.

# 🔒 Security Reminder
Selalu validasi input di server (Zod + SQL parameterized). Middleware protect route.

# 📝 Checklist Sebelum Bilang "Beres"
- Responsive (375px, 768px, 1440px)
- Loading state, Error state, Empty state
- Animasi halus
- Font rapi (`tabular-nums` buat angka)
- Warna konsisten
- Toast muncul pas success/error
- Keyboard navigation works
- Console bersih
