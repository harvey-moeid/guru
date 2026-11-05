# BYGA AI Guru Privat

PWA pribadi (single-user) untuk membaca buku berbahasa Inggris dengan terjemahan Bahasa
Indonesia on-demand, tutor AI Socratic, kuis adaptif, dan flashcard spaced repetition (FSRS).
Dibangun di atas Cloudflare Workers Free (D1 + R2), biaya target Rp0.

Status proyek: **FASE A (foundation) sedang berjalan.** Belum ada fitur yang siap dipakai.
Lihat `PLAN.md` untuk rencana lengkap dan status log, dan
`PROMPT_CODEX_BYGA_AI_GURU_PRIVAT_CLOUDFLARE_FREE.md` untuk spesifikasi otoritatif.

## Struktur

```
/apps/web        React + Vite + TS + Tailwind (SPA, PWA)
/apps/worker     Hono + TS di Cloudflare Workers (API)
/packages/shared Zod schema, tipe, konstanta, kode error bersama
/migrations      Migrasi SQL D1 bernomor
/docs            Dokumentasi (arsitektur, keamanan, deployment, dst.)
```

## Menjalankan secara lokal

Prasyarat: Node.js 20+, pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Deploy ke Cloudflare **belum tersedia dari sandbox pengembangan** — butuh kredensial
Cloudflare yang hanya dipegang pemilik. Lihat `docs/DEPLOYMENT.md` (akan ditambahkan di
FASE I) untuk panduan deploy produksi.

## Lisensi

Proprietary / penggunaan pribadi. Lihat `docs/THIRD_PARTY_LICENSES.md` untuk dependensi
pihak ketiga.
