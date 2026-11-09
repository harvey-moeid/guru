# BYGA AI Guru Privat

PWA pribadi satu pengguna untuk membaca buku berbahasa Inggris dengan terjemahan Bahasa Indonesia on-demand, tutor AI Socratic, kuis adaptif, dan flashcard spaced repetition (FSRS). Target hosting Cloudflare Workers Free (D1 + R2), dengan sasaran biaya Rp0 selama tetap dalam kuota gratis.

**Status saat ini:** fondasi (Fase A) dan autentikasi + penyimpanan buku (Fase B) sudah diimplementasikan pada branch dev. Ekstraksi PDF/EPUB (Fase C) belum dimulai; aplikasi belum siap dipakai untuk alur belajar end-to-end. Lihat PLAN.md untuk checklist dan status log, serta PROMPT_CODEX_BYGA_AI_GURU_PRIVAT_CLOUDFLARE_FREE.md untuk spesifikasi otoritatif.

## Fitur yang sudah ada di branch dev

- Login password-only, session cookie HttpOnly/Secure/SameSite, logout, dan route guard.
- Rate limit/lockout login, pemeriksaan Origin/CSRF, dan security headers.
- CRUD metadata buku dan upload file ke R2 privat (tes R2 masih menggunakan mock).
- Monorepo pnpm + Turborepo, React/Vite, Hono Worker, Zod shared schemas, dan migrasi D1 awal.

## Struktur

```
/apps/web        React + Vite + TypeScript + Tailwind (SPA)
/apps/worker     Hono + TypeScript di Cloudflare Workers (API)
/packages/shared Zod schema, tipe, konstanta, kode error bersama
/migrations      Migrasi SQL D1 bernomor
/scripts         Utilitas setup password
/docs            Dokumentasi arsitektur, keamanan, dan lisensi
```

## Menjalankan secara lokal

Prasyarat: **Node.js 22.13+** dan pnpm 9 (sesuai package.json).

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Untuk menjalankan web dan Worker secara lokal, gunakan dua terminal: `pnpm --filter @guru/worker dev` dan `pnpm --filter @guru/web dev`. Isi binding D1/R2 lokal sesuai petunjuk Wrangler; jangan masukkan secret produksi ke file lokal yang di-commit.

## Cloudflare

**NOT DEPLOYED.** Deploy produksi belum dilakukan. `database_id` di `apps/worker/wrangler.jsonc` masih placeholder dan pemilik perlu membuat D1, bucket R2, serta mengatur tiga secret auth melalui Wrangler. Panduan deployment lengkap akan ditambahkan pada Fase I.

## Lisensi

Proprietary / penggunaan pribadi. Lihat `docs/THIRD_PARTY_LICENSES.md` untuk dependensi pihak ketiga.
