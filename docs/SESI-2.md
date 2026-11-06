# Catatan Sesi 2 (FASE B, sebagian)

> Sementara berdiri sendiri agar tidak perlu menulis ulang PLAN.md utuh di tengah sesi.
> **Gabungkan ke PLAN.md (centang checklist + Status Log) pada sesi berikutnya.**

## Status langkah FASE B

| Langkah | Status | Catatan |
|---|---|---|
| B1 `scripts/setup-password` | selesai, DIUJI | 7 tes lulus (`node --test scripts/lib/password.test.mjs`) |
| B2 login HMAC + pepper | selesai, DIUJI | `apps/worker/src/routes/auth.ts`, compare waktu-konstan |
| B3 session opaque + logout + rotasi | selesai, DIUJI | token 256-bit, hash HMAC di D1, cookie HttpOnly/Secure/SameSite=Strict, TTL 7 hari, rotasi >24 jam, no-store |
| B4 rate limit + lockout persisten | selesai, DIUJI | 5 gagal/IP + 30 global per 15 menit; IP di-hash; Retry-After |
| B5 CSRF + security headers | selesai, DIUJI (API) | Origin/Referer wajib untuk mutasi; CSP/HSTS/nosniff/frame-ancestors. Header statis lewat `apps/web/public/_headers` (**TIDAK DIUJI** di runtime assets Cloudflare) |
| B6 middleware auth `/api/*` | selesai, DIUJI | publik hanya health, login, logout; rute tak dikenal tanpa login = 401 |
| B7 CRUD buku + upload | belum | keputusan upload (stream R2 vs presigned) belum diambil |
| B8 halaman /login + guard | selesai, DIUJI (unit) | `apps/web/src/{auth,pages,lib}`; 4 tes klien API. Alur login ke Worker nyata **TIDAK DIUJI** di browser |
| B9 tes keamanan | sebagian | salah password, brute force, tampering, expiry, logout/replay, CSRF, akses anonim: ada. Proteksi R2 menunggu B7 |
| B10 `docs/SECURITY.md` | belum | |

## Bukti (sandbox Node 22.23, pnpm 9.15) dan CI

- `pnpm lint`, `pnpm typecheck`, `pnpm build` exit 0.
- `pnpm test`: shared 4, web 6, worker 19 (1 health + 18 auth), scripts 7 lulus.
- **CI GitHub Actions run #13 di `dev`: success** (commit 8f09651). Run #8 sampai #12 gagal sebelumnya karena `pnpm/action-setup` diberi `version: 9` padahal `package.json` sudah punya `packageManager`; `cache: pnpm` juga dimatikan sementara karena `pnpm-lock.yaml` belum di-commit. Ini menutup bukti A8 (run aktual).
- Tes worker memakai shim D1 di atas `node:sqlite` (`apps/worker/src/test/d1-shim.ts`), **bukan D1 asli**. Migrasi `0001_init.sql` dieksekusi oleh shim sehingga valid sebagai SQLite, tetapi A6 tetap perlu `wrangler d1 migrations apply --local`.
- `pnpm format:check` gagal pada `PLAN.md`, `PROMPT_CODEX_*.md`, `docs/THIRD_PARTY_LICENSES.md`, `apps/worker/wrangler.jsonc` (sudah begitu sebelum Sesi 2; kode sumber bersih; CI tidak menjalankannya).

## Catatan untuk sesi berikutnya

- Tidak ada `git push` langsung dari sandbox (GH_TOKEN tidak valid); push lewat MCP byga.ai `push_files` dengan `owner=harvey-moeid`, `repo=guru`, `branch=dev`. Tidak ada tool patch, jadi mengedit file besar (mis. PLAN.md) berarti menulis ulang utuh.
- `AUTH_PEPPER`, `AUTH_PASSWORD_HASH`, `SESSION_SIGNING_SECRET` harus diisi lewat `wrangler secret put` sebelum login bisa dipakai; tanpa itu login mengembalikan 503.
- Cookie memakai `Secure`; di dev lokal pakai `localhost` agar cookie diterima.
- `pnpm-lock.yaml` belum di-commit (~140 KB). Setelah ada, kembalikan `cache: pnpm` di CI dan pakai `--frozen-lockfile`.
- Langkah berikutnya: **B7** (CRUD buku + keputusan upload), **B10** (`docs/SECURITY.md`), lalu FASE C.
