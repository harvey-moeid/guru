# Catatan Sesi 2 (FASE B)

> Sementara berdiri sendiri agar tidak perlu menulis ulang PLAN.md utuh (tool push tidak bisa menambal file).
> **Gabungkan ke PLAN.md (centang checklist + Status Log) pada sesi berikutnya.**

## Status langkah FASE B

| Langkah | Status | Catatan |
|---|---|---|
| B1 `scripts/setup-password` | selesai, DIUJI | 7 tes (`node --test scripts/lib/password.test.mjs`) |
| B2 login HMAC + pepper | selesai, DIUJI | `apps/worker/src/routes/auth.ts` |
| B3 session opaque + logout + rotasi | selesai, DIUJI | token 256-bit, hash di D1, cookie HttpOnly/Secure/SameSite=Strict, TTL 7 hari, rotasi >24 jam |
| B4 rate limit + lockout persisten | selesai, DIUJI | 5 gagal/IP + 30 global per 15 menit; IP di-hash |
| B5 CSRF + security headers | selesai, DIUJI (API) | header statis `apps/web/public/_headers` **TIDAK DIUJI** di runtime assets |
| B6 middleware auth `/api/*` | selesai, DIUJI | |
| B7 CRUD buku + upload | selesai, DIUJI dengan R2/D1 tiruan | `apps/worker/src/routes/books.ts`; **keputusan upload: stream `request.body` ke R2** dengan verifikasi sha256 + ukuran + magic bytes. Uji CPU/memori Workers Free untuk ~15 MB **TIDAK DIUJI**; fallback presigned PUT bila terbukti melampaui batas |
| B8 halaman /login + guard | selesai, DIUJI (unit) | alur ke Worker nyata di browser **TIDAK DIUJI** |
| B9 tes keamanan | selesai untuk lingkup B | salah password, brute force, tampering, expiry, logout/replay, CSRF, akses anonim, akses anonim ke buku/R2 |
| B10 `docs/SECURITY.md` | selesai | |

**FASE B selesai** (dengan catatan TIDAK DIUJI di atas). Checklist PLAN.md B1-B10 siap dicentang `[x]` dengan catatan itu.

## Bukti

- Sandbox Node 22.23, pnpm 9.15: `pnpm lint`, `typecheck`, `build` exit 0.
- Tes: shared 4, web 6, worker 31 (1 health + 18 auth + 12 buku), scripts 7.
- CI GitHub Actions di `dev`: run #13 success (setelah perbaikan `pnpm/action-setup`). Run setelah commit B7/B10 perlu dicek.
- Tes worker memakai shim D1 (`node:sqlite`) dan R2 tiruan di `apps/worker/src/test/`, **bukan D1/R2 asli**. A6 tetap perlu `wrangler d1 migrations apply --local`.
- `pnpm format:check` gagal pada `PLAN.md`, `PROMPT_CODEX_*.md`, `docs/THIRD_PARTY_LICENSES.md`, `apps/worker/wrangler.jsonc` (sudah sebelum Sesi 2; CI tidak menjalankannya).

## Catatan untuk sesi berikutnya

- Tidak ada `git push` langsung dari sandbox (GH_TOKEN tidak valid); push lewat MCP byga.ai `push_files` (`owner=harvey-moeid`, `repo=guru`, `branch=dev`). Setelah push, samakan checkout lokal: `git fetch origin dev && git reset --hard origin/dev`.
- Secret login (`AUTH_PEPPER`, `AUTH_PASSWORD_HASH`, `SESSION_SIGNING_SECRET`) diisi lewat `wrangler secret put`; tanpa itu login 503. Cookie `Secure`, jadi dev lokal pakai `localhost`.
- `pnpm-lock.yaml` belum di-commit (~140 KB). Commit dari komputer pemilik, lalu aktifkan `cache: pnpm` dan `--frozen-lockfile` di CI.
- Langkah berikutnya: **FASE C**, mulai **C1** (spike PDF.js di Web Worker + build produksi Vite), lalu C3 (validasi upload + SHA-256 di browser; endpoint server sudah menuntut `sha256` hex huruf kecil), C2, C4.
