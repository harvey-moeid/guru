# ARCHITECTURE.md — BYGA AI Guru Privat

Dokumen ini mencatat implementasi yang benar-benar ada di branch dev, keputusan teknis, dan batas verifikasi. Spesifikasi otoritatif tetap PROMPT_CODEX_BYGA_AI_GURU_PRIVAT_CLOUDFLARE_FREE.md; urutan kerja di PLAN.md.

## Struktur repo saat ini

```
/apps/web                 React + Vite + TS + Tailwind, SPA, auth/login
/apps/worker              Hono + TS, auth/session + CRUD buku + R2 upload
/packages/shared          Zod schemas, DTO, tipe, konstanta, error code
/migrations               SQL D1 bernomor
/scripts                  generator password dan helper
/docs                     arsitektur, keamanan, lisensi
/.github/workflows        CI dan pemangkasan run manual
```

packages/learning (BKT/FSRS) dan packages/ai (adapter provider) belum dibuat; keduanya ditambahkan saat fase terkait agar tidak ada paket kosong.

## Status implementasi

- Fase A — fondasi monorepo, Worker, SPA, shared schemas, migrasi awal, CI, dokumentasi: sudah dibuat. Migrasi D1 lokal nyata dan run CI GitHub belum dibuktikan dalam audit ini.
- Fase B — autentikasi password-only, session, rate limit, CSRF/security headers, route guard/login, CRUD buku, upload R2 streaming: sudah diimplementasikan dan memiliki tes otomatis di branch dev.
- Fase C — ekstraksi PDF/EPUB: belum dimulai. Langkah berikutnya C1, uji PDF.js di Web Worker dan aset worker pada Vite production build.
- Deploy produksi: NOT DEPLOYED. ID D1 masih placeholder dan bucket/secret harus disiapkan pemilik.

## Keputusan teknis

### Frontend dan Worker

- React + Vite + Tailwind untuk SPA; Hono pada Cloudflare Workers untuk API.
- Satu origin untuk SPA dan API melalui Workers Static Assets.
- PDF/EPUB diproses di browser, bukan Worker, agar parsing besar tidak menghabiskan CPU/memori request Worker.

### Upload buku (B7)

Upload saat ini menggunakan streaming request body dari Worker ke bucket R2 privat, bukan buffering seluruh file di memori Worker. Kunci objek memakai UUID dan DTO tidak mengungkap kunci R2. R2 tiruan memverifikasi alur checksum/ukuran/signature dalam tes.

Belum diverifikasi: perilaku checksum pada R2 sungguhan dan batas CPU/memori Workers Free untuk file mendekati 15 MB. Jika pengujian nyata gagal, evaluasi presigned PUT langsung browser → R2.

### Static Assets dan konfigurasi

apps/worker/wrangler.jsonc menunjuk ../web/dist; web harus dibangun sebelum dry-run/deploy Worker. database_id masih placeholder REPLACE_WITH_REAL_D1_ID sampai pemilik membuat D1.

### Lockfile

pnpm-lock.yaml belum ada di branch dev saat audit. CI sementara memakai pnpm install, bukan --frozen-lockfile. Tambahkan lockfile dari lingkungan yang dapat menjalankan pnpm dan ubah CI ke instalasi frozen setelah diverifikasi.

## Status verifikasi

| Area | Status |
|---|---|
| Auth/session/CSRF/rate limit | Unit/integration tests tercatat pada commit fase B |
| CRUD + upload | Tes menggunakan R2 tiruan |
| D1 lokal nyata | Belum diverifikasi |
| R2 nyata + limit CPU Workers Free | Belum diverifikasi |
| GitHub Actions CI terbaru | Belum dikonfirmasi pada audit ini |
| Cloudflare production deploy | NOT DEPLOYED |
