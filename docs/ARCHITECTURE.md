# ARCHITECTURE.md

Dokumen ini mencatat keputusan arsitektur dan penyimpangan dari struktur target di PLAN.md §2.
Lihat juga `PROMPT_CODEX_BYGA_AI_GURU_PRIVAT_CLOUDFLARE_FREE.md` (SPEK) untuk spesifikasi lengkap.

## Struktur repo (status: FASE A)

```
/apps/web                React + Vite + TS + Tailwind, SPA, PWA (shadcn/ui belum dipasang)
/apps/worker              Hono + TS + Cloudflare Workers API
/packages/shared          Zod schemas, DTO, tipe, konstanta, error code
/migrations                SQL D1 bernomor
/.github/workflows         ci.yml
/docs                      dokumentasi
```

`/packages/learning` (BKT, FSRS) dan `/packages/ai` (adapter provider) belum dibuat — akan
ditambahkan di FASE D dan F sesuai kebutuhan, bukan di FASE A, supaya tidak ada paket kosong
tanpa isi nyata.

## Penyimpangan dari SPEK/PLAN (FASE A)

1. **shadcn/ui belum diinstal.** PLAN.md §2 menyebut shadcn/ui sebagai bagian stack frontend.
   Di FASE A, hanya Tailwind yang dipasang karena shadcn/ui butuh pemilihan komponen yang baru
   relevan mulai FASE B (halaman login) dan seterusnya. Komponen akan ditambahkan per kebutuhan
   fitur, bukan di-generate penuh di awal.
2. **Static Assets build output.** `apps/worker/wrangler.jsonc` menunjuk `../web/dist` sebagai
   direktori assets. Ini mengasumsikan `apps/web` di-build sebelum worker di-deploy — urutan ini
   harus dijaga di CI/CD produksi (lihat I2).
3. **`wrangler.jsonc` berisi `database_id` placeholder** (`REPLACE_WITH_REAL_D1_ID`) karena D1
   belum diprovisikan (butuh akses Cloudflare API yang tidak tersedia di sandbox). Pemilik wajib
   menggantinya setelah `wrangler d1 create guru-db` (lihat I4).

## Upload buku: streaming vs presigned PUT (B7)

Keputusan ini **belum diambil** — akan diuji dan didokumentasikan di sini saat FASE B7
dikerjakan, berdasarkan uji CPU/memori Worker Free untuk file hingga 15 MB.

## `pnpm-lock.yaml` belum di-commit (Sesi 1)

Lockfile hasil `pnpm install` tidak di-push di Sesi 1 karena ukurannya (~140 KB) berisiko
rusak saat ditransfer manual lewat MCP tanpa akses filesystem langsung ke GitHub. CI untuk
sementara memakai `pnpm install` biasa (bukan `--frozen-lockfile`). **Tindak lanjut:** sesi
berikut yang punya akses `git push` langsung (mis. lewat Claude Code/terminal) sebaiknya
men-generate ulang dan commit `pnpm-lock.yaml`, lalu kembalikan CI ke `--frozen-lockfile`.

## Status deploy

**NOT DEPLOYED.** Sandbox Claude tidak punya akses Cloudflare API (lihat jaringan yang
diizinkan). Build/lint/typecheck/test dijalankan lokal; deploy nyata adalah tanggung jawab
pemilik (SPEK §17, PLAN.md I8).
