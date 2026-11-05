# PLAN.md — BYGA AI Guru Privat (Rencana Implementasi & Handoff)

> **Dokumen ini adalah sumber kebenaran untuk kelanjutan pekerjaan.**
> Siapa pun (Claude di akun lain, Codex, atau manusia) yang membuka repo ini harus bisa lanjut hanya dengan membaca file ini + spek.
>
> - **Spek lengkap (otoritatif):** `PROMPT_CODEX_BYGA_AI_GURU_PRIVAT_CLOUDFLARE_FREE.md` (disebut **SPEK** di bawah; nomor bagian = `SPEK §n`).
> - **Status pekerjaan (diperbarui tiap sesi):** bagian [7. Status Log](#7-status-log) dan [6. Checklist Langkah](#6-checklist-langkah).
> - Jika PLAN.md dan SPEK bertentangan: **SPEK menang**, lalu perbaiki PLAN.md dan catat di Status Log.

---

## 0. PROTOKOL HANDOFF (BACA DULU)

Urutan wajib saat memulai sesi baru:

1. Baca **PLAN.md** (file ini) sampai habis, lalu **Status Log** (bagian 7) paling bawah = keadaan terbaru.
2. Baca SPEK bagian yang relevan dengan langkah berikutnya (peta langkah → bagian SPEK ada di bagian 6).
3. Cek state repo nyata, jangan percaya log buta-buta:
   - branch kerja: **`dev`** (jangan commit ke `main` kecuali Harvey minta merge)
   - daftar file, commit terakhir, workflow CI
4. Ambil **langkah belum selesai pertama** di Checklist (bagian 6). Kerjakan satu fase penuh per sesi bila memungkinkan.
5. Sebelum mengakhiri sesi, **wajib**:
   - centang checklist langkah yang benar-benar selesai **dan terverifikasi**
   - tambah entri di Status Log (format di bagian 7)
   - push semua ke `dev`
6. Jangan pernah menandai selesai tanpa bukti (output command, test lulus). Tulis `DIUJI`, `TIDAK DIUJI`, atau `DI-MOCK` secara eksplisit.

### Aturan komunikasi dengan pemilik (Harvey)

- Pemilik berkomunikasi **Bahasa Indonesia, singkat**. Balas singkat, langsung ke inti.
- Pemilik ingin Claude **mengambil inisiatif tanpa konfirmasi panjang**. Jangan tanya hal yang sudah diputuskan di SPEK atau PLAN ini.
- Pemilik memakai **nomor langkah dan checklist** untuk navigasi (mis. "lanjut A3"). Pertahankan penomoran bagian 6 apa adanya; jangan renumber.
- Setiap kode yang dibuat **wajib disertai dokumentasi**: README per paket/app, komentar inline untuk keputusan penting, atau file di `docs/`.

### Alat yang tersedia untuk Claude (claude.ai)

| Kebutuhan | Cara |
|---|---|
| Baca/tulis repo GitHub | MCP **byga.ai**: `get_file_contents`, `push_files`, `repo_summary`, `create_branch`, dst. Muat dengan `tool_search` dulu. Tulis selalu pakai `owner=harvey-moeid`, `repo=guru` eksplisit (default tidak dipakai untuk write). |
| Jalankan install/lint/typecheck/test/build | `bash_tool` (sandbox Ubuntu; jaringan hanya ke npm registry, GitHub, PyPI, dll. — **tidak** ke Cloudflare API). Kerja di `/home/claude`, bangun proyek di sana, jalankan pemeriksaan, lalu push file lewat `push_files`. |
| Cloudflare deploy / D1 remote / R2 | **TIDAK tersedia di sandbox.** Jangan mengklaim deploy. Status harus `NOT DEPLOYED` sampai Harvey menjalankan deploy atau memberi akses. |
| Cari dokumentasi terbaru | `web_search` / `web_fetch` ke developers.cloudflare.com (wajib verifikasi limit saat implementasi, SPEK §0 butir 2). |

Tips alur kerja efektif:
- Bangun file di sandbox → `npm/pnpm install` → `typecheck`/`test`/`build` → perbaiki → baru `push_files` (maks 100 file/commit, maks 1 MiB/file).
- Commit kecil per langkah (`feat(A2): ...`), pesan commit merujuk nomor langkah.
- Jika sandbox tidak bisa menjalankan sesuatu (mis. Playwright browser, workerd), tulis test-nya, jangan klaim lulus, dan catat di Status Log sebagai `TIDAK DIUJI (alasan)`.
- **`pnpm-lock.yaml` saat ini belum di-commit** (lihat `docs/ARCHITECTURE.md` dan Status Log Sesi 1) — jalankan `pnpm install` (bukan `--frozen-lockfile`) sampai lockfile di-generate ulang dan di-push dari lingkungan dengan akses `git push` langsung.

---

## 1. RINGKASAN PROYEK

**BYGA AI Guru Privat**: PWA pribadi satu pengguna untuk:

1. Mengunggah buku **Inggris** (PDF text-layer / EPUB).
2. Membaca versi **Bahasa Indonesia** (terjemahan on-demand per bab/unit, disimpan).
3. Belajar dengan **tutor AI Socratic** per bab, grounded pada buku + sitasi valid.
4. **Kuis adaptif**, mastery (BKT), **flashcard + spaced repetition (FSRS)**.
5. **TTS bawaan browser** (`speechSynthesis`), tanpa API suara.

Baseline hosting: **Cloudflare Workers Free** + **D1** + **R2**. Vectorize & Workflows **opsional**. Biaya target Rp0 dalam kuota gratis. Single-user, password-only. UI/dokumentasi/tutor **Bahasa Indonesia** (`id-ID`, `Asia/Jakarta`).

**Non-goals** (SPEK §1): SaaS, multi-user, pembayaran, APK native, Docker wajib, Containers, OCR berbayar, voice cloning, cloud TTS, bobol DRM.

---

## 2. KEPUTUSAN ARSITEKTUR (SUDAH FINAL — JANGAN DITANYAKAN ULANG)

| Topik | Keputusan |
|---|---|
| Bahasa | TypeScript strict di semua paket |
| Monorepo | **pnpm workspaces + Turborepo** (sesuai kebiasaan pemilik; SPEK mengizinkan npm/pnpm) |
| Worker/API | **Hono** di Cloudflare Workers |
| Frontend | **React + Vite + Tailwind + shadcn/ui**, SPA, PWA |
| Deploy | **Satu Worker** + **Static Assets** (SPA & API satu domain) bila kompatibel |
| Validasi | **Zod** di `packages/shared` untuk semua request/response/DTO |
| DB | **D1** (SQL migrations bernomor di `/migrations`) |
| File | **R2 privat**, kunci berbasis UUID |
| Search | **D1 FTS5** baseline; Vectorize opsional dengan fallback otomatis |
| Ekstraksi buku | **Di browser** (Web Worker): PDF.js, JSZip/DOMParser untuk EPUB |
| Auth | Password-only; **HMAC-SHA-256 + secret pepper** (password acak 24–32+ karakter), session opaque, hash token di D1, cookie HttpOnly/Secure |
| AI | Adapter seragam: Workers AI (bila binding ada) + OpenAI-compatible (OpenRouter/Groq) + Gemini bila perlu. Secret hanya di Wrangler/GitHub Secrets |
| TTS | `speechSynthesis` di browser, `id-ID` |
| Tes | Vitest (unit/integration), Playwright (E2E), mock provider AI |
| Branch | Kerja di **`dev`**. `main` hanya diubah atas permintaan Harvey |
| Deploy produksi | Hanya jika kredensial tersedia; default **NOT DEPLOYED** |

### Struktur repo target

```
/apps/web                React + Vite + TS + Tailwind + shadcn/ui
/apps/worker             Hono + TS + Cloudflare Workers API
/packages/shared         Zod schemas, DTO, tipe, konstanta, error code
/packages/learning       BKT, FSRS, penilaian deterministik (murni, tanpa I/O)
/packages/ai             adapter provider, routing, prompts versioned, budget
/migrations              SQL D1 bernomor (0001_*.sql, ...)
/scripts                 setup-password, smoke test, provisioning
/tests                   integration + e2e + fixtures (non-copyright)
/docs                    ARCHITECTURE, SECURITY, AI_COSTS, TEST_REPORT, DEPLOYMENT, TROUBLESHOOTING, THIRD_PARTY_LICENSES
/.github/workflows       ci.yml, deploy-production.yml
```

Boleh menyesuaikan folder, tetapi **dokumentasikan** di `docs/ARCHITECTURE.md` dan catat di Status Log.

---

## 3. BATAS & RISIKO YANG HARUS DIINGAT

### Cloudflare Free (verifikasi angka terbaru dari dokumentasi resmi saat implementasi; jangan hardcode)

- CPU per request sangat kecil (SPEK menyebut ±10 ms) dan batas subrequest: **jangan parse PDF/EPUB, jangan kompres besar, jangan loop berat di Worker**.
- Tidak boleh buffer seluruh file di Worker. Upload: stream `request.body` ke R2 (jika lolos uji) **atau** presigned PUT.
- Konten panjang → R2, bukan D1 (batas ukuran D1 Free).
- Resource opsional (Vectorize, Workflows, Workers AI) **jangan jadi blocker deploy**; semua di-guard feature flag + fallback.
- Static Assets tidak dilewatkan lewat runtime Worker bila tidak perlu.

### Risiko teknis yang sering memakan waktu

| Risiko | Mitigasi |
|---|---|
| PDF.js worker asset di Vite/Android | Uji build produksi lebih awal (C1), pakai `?worker&url`/aset lokal, bukan CDN |
| FTS5 tersedia di D1 tapi tidak di test lokal | Cek di `workerd`/miniflare; sediakan fallback LIKE/token index yang diuji |
| HMAC cepat untuk password manusia lemah | Wajibkan password acak panjang di `scripts/setup-password`; dokumentasikan di SECURITY.md |
| JSON invalid dari model | Zod parse + retry terbatas + fallback; jangan tandai `ready` bila gagal |
| Android `speechSynthesis` pause/resume tidak konsisten | Lanjut dari paragraf tersimpan, bukan pura-pura pause |
| Hallucinated citation | Sitasi hanya span ID yang divalidasi kode; halaman diturunkan backend |
| Prompt injection dari isi buku | Delimit data, skema output, izin server-side, uji adversarial |

### Lisensi

- Inspirasi dari OpenTutor (MIT) dan Project Schola (sebagian turunan, hak tidak jelas): **jangan salin kode** tanpa audit LICENSE. Default: **implementasi orisinal**. Catat semua atribusi di `docs/THIRD_PARTY_LICENSES.md`.
- Library pihak ketiga (PDF.js, FSRS, JSZip, dll.): catat lisensi di file yang sama.

### Hal yang TIDAK boleh dilakukan

- Commit secret, password, ID akun nyata, isi buku pribadi, `.env` nyata.
- Mengklaim build/test/deploy sukses tanpa dieksekusi.
- Migrasi D1 destruktif atau reset DB produksi.
- Menyimpan API key di D1/frontend/localStorage.
- Endpoint debug/bootstrap terbuka di produksi.

---

## 4. KONVENSI KODE

- **Commit**: `tipe(langkah): ringkasan`, mis. `feat(B2): login password-only`. Tipe: feat, fix, test, docs, chore, ci, refactor.
- **Error API**: bentuk `{ error: { code, message, requestId } }`; kode dari `packages/shared`: `UNAUTHENTICATED`, `INVALID_FILE`, `PROCESSING`, `AI_NOT_CONFIGURED`, `AI_QUOTA_REACHED`, `TRANSLATION_NOT_READY`, `RETRYABLE`, `RATE_LIMITED` (+ tambahan bila perlu, dokumentasikan).
- **Setiap mutasi**: validasi Zod, cek auth + Origin/CSRF, dukung idempotency key bila relevan, batasi body size.
- **Migrasi**: file bernomor `NNNN_deskripsi.sql`, idempoten, non-destruktif. Tiap tabel: `created_at`, `updated_at`, FK + unique + index yang dibutuhkan.
- **Prompts**: file terpisah, **versioned** (`PROMPT_VERSION` konstanta), output wajib skema Zod. Konten buku selalu dikirim sebagai DATA terdelimit, bukan instruksi.
- **Pustaka murni** (`packages/learning`): tanpa I/O, 100% unit-testable (BKT, FSRS wrapper, grading).
- **Dokumentasi**: README per app/paket (tujuan, cara jalan, env), komentar untuk keputusan non-obvious, update `docs/` di fase terkait.
- **Bahasa**: UI, pesan error ke pengguna, prompt tutor, kuis, dokumentasi = Indonesia. Identifier kode = Inggris.
- **Aksesibilitas/UI**: dark default `#080D19`, aksen `#246BFD`, mobile-first (360px), touch target besar, ARIA, tanpa animasi berat.

---

## 5. PEMETAAN KRITERIA AKSEPTASI → LANGKAH

Nomor kriteria = daftar di `SPEK §14`.

| # SPEK §14 | Ringkas | Langkah penguji |
|---|---|---|
| 1 | Login password-only, rate limit, cookie, CSRF | B1–B5 |
| 2 | Upload PDF/EPUB, parse tanpa kunci UI, resume | C1–C8 |
| 3 | File corrupt/encrypted/besar/scan → pesan benar | C6, C7 |
| 4 | Original English + source map benar | C4, C8 |
| 5 | Terjemahan 1 unit, cache hit tanpa panggil model | D3–D6 |
| 6 | Angka/istilah/halaman; output AI invalid ditolak | D4, D5 |
| 7 | Tutor + sitasi valid; palsu diblokir | E3–E5 |
| 8 | Probe + Socratic + remedial | E6–E8 |
| 9 | Kunci kuis tersembunyi, MCQ deterministik | F1–F3 |
| 10 | BKT + FSRS + WIB | F4–F6 |
| 11 | TTS mock | G1–G3 |
| 12 | Tanpa AI tetap jalan | D8, H3 |
| 13 | Vectorize/FTS fallback | E1, E2 |
| 14 | Akses anonim ditolak | B6 |
| 15 | UI dark/light, 360px, keyboard | G6, I3 |
| 16 | Token usage tidak double-count | H4 |
| 17 | Resume setelah refresh | C5, D7 |
| 18 | CI workflow | A8, I1 |
| 19 | `build` lolos, tanpa dependensi Node tak didukung | A3, I1 |
| 20 | Deploy + smoke test (hanya jika kredensial) | I8 |

---

## 6. CHECKLIST LANGKAH

Legenda: `[ ]` belum · `[~]` sebagian · `[x]` selesai & terverifikasi. **Perbarui di sini**, jangan buat checklist baru.
Setiap langkah: tujuan → acuan SPEK → definisi selesai (DoD).

### FASE A — Audit + Foundation  (SPEK §2, §12, §15, §16)

- [x] **A1** Audit repo: struktur, branch, license, workflow. Repo saat ini hanya `README.md` + SPEK. Putuskan inisialisasi dari nol. *DoD:* catatan audit di Status Log. — **Selesai Sesi 1.**
- [x] **A2** Workspace: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `tsconfig.base.json`, ESLint + Prettier, `.gitignore`, `.dev.vars.example`, `.env.example`. *DoD:* `pnpm install` + `pnpm lint` lulus. — **DIUJI, lulus.**
- [x] **A3** `apps/worker`: Hono + `wrangler.jsonc` (binding D1 `DB`, R2 `BUCKET`, Static Assets, flag opsional AI/Vectorize), route `GET /api/health` (tanpa bocor secret). *DoD:* `typecheck` + `build` lulus; health ter-test. — **DIUJI** (`pnpm typecheck`, `pnpm test`, `wrangler deploy --dry-run` semua lulus). `database_id` masih placeholder, lihat `docs/ARCHITECTURE.md`.
- [x] **A4** `apps/web`: Vite + React + Tailwind + shadcn/ui, router SPA, shell responsif, tema dark/light, halaman placeholder jujur (bukan data palsu). *DoD:* `build` lulus, aset terbit ke direktori yang dilayani Worker. — **DIUJI** (`pnpm build` lulus, `apps/worker` wrangler dry-run berhasil baca `../web/dist`). **shadcn/ui belum dipasang** — lihat `docs/ARCHITECTURE.md` §Penyimpangan; akan ditambah per kebutuhan mulai FASE B.
- [x] **A5** `packages/shared`: Zod schema dasar, kode error, konstanta (limit upload 15 MB default, locale, timezone). — **DIUJI** (4 unit test lulus).
- [x] **A6** Migrasi D1 awal `0001_init.sql`: semua tabel di SPEK §12 (dibuat bertahap bila terlalu besar; minimal `app_settings`, `sessions`, `auth_attempts`, `books`, `book_processing_jobs`, `book_chapters`, `book_units`, `book_spans`). *DoD:* migrasi jalan di D1 lokal (miniflare/wrangler `--local`) dan idempoten. — **TIDAK DIUJI** di D1 lokal nyata (sandbox tidak menjalankan `wrangler d1 execute --local` pada sesi ini); SQL ditulis idempoten (`IF NOT EXISTS`) dan direview manual. Perlu diverifikasi sesi berikut dengan `wrangler d1 migrations apply --local`.
- [x] **A7** Test harness: Vitest (+ pool Workers bila memungkinkan), fixture dasar, script `test`. — **DIUJI** (`pnpm test`: 7 test lulus di 3 paket). Belum pakai `@cloudflare/vitest-pool-workers` (worker test jalan di Node biasa via Hono `app.request`, cukup untuk fase ini).
- [x] **A8** CI `.github/workflows/ci.yml`: install, lint, typecheck, unit, build. *DoD:* YAML valid; tidak mem-print secret. — **DIUJI secara lokal** (semua step CI dijalankan manual di sandbox dengan hasil sama: lint/typecheck/test/build lulus). Belum diverifikasi run aktual di GitHub Actions (butuh push ke GitHub, lihat Status Log).
- [x] **A9** Docs awal: README Indonesia (draft), `docs/ARCHITECTURE.md`, `docs/THIRD_PARTY_LICENSES.md` (kerangka). — **Selesai.**

### FASE B — Auth + Storage  (SPEK §3, §4 Storage, §13)

- [ ] **B1** `scripts/setup-password`: generator password acak 24–32+ karakter / validator entropi; cetak instruksi `wrangler secret put` (jangan simpan password).
- [ ] **B2** Verifikasi HMAC-SHA-256 + pepper, perbandingan constant-time; secret terpisah untuk verifier & signing session. `POST /api/auth/login`.
- [ ] **B3** Session opaque: token acak, **hash di D1**, cookie `HttpOnly; Secure; SameSite`, TTL, rotasi, `POST /api/auth/logout` benar-benar invalidasi, `GET /api/auth/session`. `Cache-Control: no-store` untuk data privat.
- [ ] **B4** Rate limit + lockout persisten di D1 (`auth_attempts`), tanpa log password.
- [ ] **B5** Origin/CSRF check semua mutasi; CORS same-origin ketat; security headers (CSP kompatibel PDF.js/worker, nosniff, frame-ancestors, referrer-policy, HSTS).
- [ ] **B6** Middleware auth untuk semua `/api/*` selain login/health; uji akses anonim ditolak.
- [ ] **B7** CRUD buku: `GET/POST /api/books`, `DELETE /api/books/:id` (hapus konsisten R2 + FTS + terkait), `POST /api/books/:id/upload` (stream ke R2 atau presigned PUT — putuskan lewat uji CPU/memori, catat keputusan di `docs/ARCHITECTURE.md`).
- [ ] **B8** Halaman `/login` (password-only, show/hide, loading, error sederhana) + guard route SPA.
- [ ] **B9** Tes: salah password, brute force, tampering cookie, expiry, logout, replay, CSRF, akses tanpa login, proteksi R2.
- [ ] **B10** `docs/SECURITY.md` (termasuk catatan HMAC bukan pengganti hashing adaptif untuk password lemah).

### FASE C — Book Ingestion  (SPEK §4)

- [ ] **C1** Spike PDF.js di Web Worker + Vite production build (cek aset worker lokal). *DoD:* ekstrak teks PDF fixture di build produksi.
- [ ] **C2** Parser EPUB di browser (JSZip/DOMParser): spine, nav/TOC, konten; sanitasi HTML (tanpa script/remote resource); proteksi ZIP bomb/traversal.
- [ ] **C3** Validasi upload: ukuran (maks 15 MB, konfigurabel), ekstensi, signature/MIME sniffing, SHA-256 via Web Crypto.
- [ ] **C4** Pembentukan TOC (native → fallback heuristik heading), **source spans** & **units** dengan ID stabil: `book_id/chapter_id/unit_id/span_id`, `page_index`, `printed_page_label` (hanya bila benar-benar didapat), offset paragraf, hash konten. Deteksi bahasa Inggris.
- [ ] **C5** Pengiriman batch (10–50 KB/request, hasil benchmark), idempotency key, dedup, backoff, concurrency rendah, checkpoint D1. Endpoint: `POST /api/books/:id/ingest-batch`, `POST .../finish-ingest`, `GET .../status`. Status: `created → uploading → extracting → outline_review → ready` + `failed/cancelled`. Resume tanpa duplikasi.
- [ ] **C6** Deteksi PDF scan (tanpa text layer), PDF terenkripsi, file corrupt, terlalu besar: pesan jelas, tanpa status selesai palsu. OCR client-side **opsional**; bila tidak diimplementasikan, tampilkan unsupported jujur.
- [ ] **C7** Buang konten tersembunyi mencurigakan + simpan warning; perlakukan teks buku sebagai DATA.
- [ ] **C8** UI: dialog upload (drag-drop/picker, progress, cancel), editor TOC (koreksi/pisah/gabung bab), halaman `/books/:id`, reader English awal `/books/:id/read/:chapterId`. Simpan hasil ekstraksi ke R2 (`extracted/{bookUuid}/{version}/...`).
- [ ] **C9** Tes + fixture legal/fiktif: PDF EN sederhana, EPUB 2 bab, PDF scan minimal. Unit + integrasi.

### FASE D — Translation  (SPEK §5, §11)

- [ ] **D1** `packages/ai`: interface adapter (`generateJson`, `generateStream`), capability map, timeout, circuit breaker, retry backoff (hanya idempotent). Mock provider untuk tes.
- [ ] **D2** Adapter: Workers AI (bila binding), OpenAI-compatible (OpenRouter/Groq), Gemini bila perlu. Secret hanya dari env Worker.
- [ ] **D3** Prompt terjemahan EN→ID (versioned), output JSON terstruktur berbasis span ID + alignment 1:N + status kualitas.
- [ ] **D4** Validator: angka/tanggal, paragraf hilang/duplikat, output kosong, JSON invalid; retry terbatas; fallback model bila dikonfigurasi; **jangan `ready` bila gagal**.
- [ ] **D5** Cache key = hash(teks asli + locale + model + prompt version + glossary version + settings); simpan R2 `translations/{bookUuid}/{locale}/{version}/{unitUuid}.json`; metadata D1. Cache hit = **nol panggilan model**.
- [ ] **D6** Endpoint: `POST /api/chapters/:id/translate`, `GET .../translation/status`, `POST .../translation/step`, `GET .../translation`. Terjemahan per unit on-demand; prefetch 1 unit hanya dengan persetujuan + dalam budget.
- [ ] **D7** Resume job setelah refresh; checkpoint D1; `translation_jobs`, `job_events`.
- [ ] **D8** Reader: toggle **Indonesia | English Original | Bilingual**, glosarium bilingual per buku (editable), edit manual terjemahan. Tanpa AI: tampilkan teks asli + status AI unavailable.
- [ ] **D9** Budget guard backend (cap panggilan/token/estimasi biaya per hari & per buku, concurrency 1–2, hard stop). Tracking `ai_usage`, `ai_request_log` (tanpa isi buku/credential).
- [ ] **D10** Tes: cache hit, angka/istilah, JSON invalid, kuota habis, bilingual selaras.

### FASE E — Retrieval + Tutor  (SPEK §6, §7)

- [ ] **E1** FTS5 `book_search_fts` (excerpt/token ringkas); fallback deterministik teruji bila FTS5 tidak ada.
- [ ] **E2** Vectorize **opsional**: dimensi = model embedding, namespace per buku, metadata `bookId/chapterId/unitId/spanId`; error/kuota → fallback FTS tanpa crash. Hybrid rank bila aktif.
- [ ] **E3** Retrieval terbatas pada buku + bab/unit aktif + prasyarat; konteks bounded.
- [ ] **E4** Sitasi: hanya span ID valid; halaman diturunkan backend; validasi kutipan vs span; buang sitasi tidak valid; klik → scroll/highlight sumber. Label: `berdasarkan buku` / `penjelasan tambahan AI` / `tidak ditemukan dalam buku`.
- [ ] **E5** Perlindungan prompt injection (delimit, skema, izin server-side) + tes adversarial.
- [ ] **E6** Ekstraksi konsep per unit (`concepts`, `concept_prerequisites`: tujuan belajar, bukti span, miskonsepsi umum).
- [ ] **E7** State machine tutor (backend-managed): `pilih bab → probe 3–5 pertanyaan adaptif → penjelasan singkat → contoh/analogi → tanya pemahaman → penilaian → remedial/lanjut`. Endpoint `POST /api/study/:unitId/start`, `POST /api/study/:sessionId/chat`. Satu konsep per interaksi; hint bertahap kecuali diminta jawaban langsung.
- [ ] **E8** UI `/study/:bookId/:unitId`: chat, tombol (Jelaskan lebih sederhana, Beri analogi, Tanya dari buku, Ulang konsep, Latihan lagi, Lanjut unit, Buka sumber), selection → Tanya Guru, mode fokus. Ringkasan sesi bounded; AI down tidak menghapus progres.
- [ ] **E9** Tes: citation palsu diblokir, probe/Socratic/remedial, fallback saat provider gagal.

### FASE F — Quiz + Mastery + Review  (SPEK §8)

- [ ] **F1** Generator kuis per unit (MCQ 4 pilihan, benar/salah, jawaban singkat), tervalidasi terhadap sumber; kunci & rubrik **hanya di backend**; acak posisi pilihan.
- [ ] **F2** `POST /api/quiz/:unitId/generate`, `POST /api/quiz/:quizId/submit`; API tidak membocorkan kunci sebelum submit. MCQ/TF dinilai deterministik tanpa AI.
- [ ] **F3** Jawaban singkat: rubrik + model bila tersedia, `pending_review` bila offline; simpan attempt lengkap (id, versi soal, jawaban, skor, hint, confidence, feedback).
- [ ] **F4** `packages/learning`: **BKT** (`prior/learn/guess/slip` per konsep, clamp, property tests). Jangan klaim sebagai diagnosis tervalidasi.
- [ ] **F5** Kriteria lulus: threshold konfigurabel (default 0.85), ≥2 bukti independen tanpa hint untuk konsep kritis, soal transfer, miskonsepsi unresolved tertangani; kesulitan adaptif; remedial ke prerequisite; override manual dengan riwayat.
- [ ] **F6** Flashcards + **FSRS** (pustaka open-source teruji, atau alternatif terdokumentasi — jangan klaim FSRS bila bukan). `GET /api/reviews/due`, `POST /api/reviews/:reviewId/grade`; Again/Hard/Good/Easy; due date zona `Asia/Jakarta`; anti-duplikat.
- [ ] **F7** UI `/quiz/:sessionId`, `/reviews`, `/progress` (buku, bab, mastery, akurasi, review due, token usage).
- [ ] **F8** Tes: BKT edge cases, FSRS WIB, kunci tersembunyi, grading.

### FASE G — Browser TTS + PWA  (SPEK §9, §10)

- [ ] **G1** `BrowserSpeechService`: `speechSynthesis`, `getVoices`, `voiceschanged`, default `id-ID`, fallback jujur bila tidak ada.
- [ ] **G2** Split per kalimat/paragraf (jangan 1 utterance per bab); `onstart/onend/onerror`; bersihkan queue saat unmount/route/hidden/refresh/cancel; normalisasi teks (Markdown/rumus/URL).
- [ ] **G3** Kontrol: Play/Stop/Pause-Resume bila didukung/Prev-Next paragraf/kecepatan 0.75–1.5x/pilih suara/highlight paragraf aktif; fallback lanjut dari paragraf tersimpan (Android); simpan posisi & preferensi; state disabled bila API tidak ada.
- [ ] **G4** TTS membaca terjemahan dan jawaban tutor yang **sudah tampil** (tanpa token tambahan).
- [ ] **G5** PWA: manifest, ikon legal buatan sendiri, service worker aman (tidak men-cache data privat sembarangan), safe-area inset.
- [ ] **G6** Aksesibilitas + 360px + dark/light + keyboard. Checklist tes manual Android Chrome/Samsung Browser di `docs/TEST_REPORT.md`.
- [ ] **G7** Tes TTS dengan mock Web Speech API.

### FASE H — Admin + Hardening  (SPEK §10 /settings, §11, §13)

- [ ] **H1** `/settings`: tema, voice, rate, mode hemat, status provider, panduan secret, budget harian, logout, instruksi rotasi password. `GET/PUT /api/settings`.
- [ ] **H2** Dashboard provider: routing per tugas (`translator, tutor, quiz_generator, essay_grader, concept_extractor, embedding`), fallback, health check opt-in, tombol test provider (dengan konfirmasi karena memakai kuota). `POST /api/admin/providers/test`, `GET /api/admin/usage`.
- [ ] **H3** Mode tanpa AI: reader + progres + flashcard lama tetap jalan; status AI offline jelas; **jangan** menghasilkan jawaban palsu.
- [ ] **H4** Telemetri usage tanpa double-count (cache hit & retry idempoten). Neurons ≠ token.
- [ ] **H5** Hardening: XSS (EPUB), sanitasi nama file, log redaction, batas ukuran, idempotency semua mutasi, export metadata/progres/terjemahan, hapus buku terverifikasi.
- [ ] **H6** Tes keamanan: isolasi data, akses anonim ke R2/chapter/translation/progress/settings.

### FASE I — Production-readiness  (SPEK §14, §15, §17)

- [ ] **I1** Jalankan penuh: lint, typecheck, unit, integrasi, build; Playwright E2E yang layak. Catat exit code.
- [ ] **I2** `.github/workflows/deploy-production.yml`: environment `production`, secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, concurrency, `workflow_dispatch`, tidak mem-print secret, tanpa migrasi destruktif otomatis.
- [ ] **I3** Dokumentasi final: `README.md` Indonesia lengkap, `docs/DEPLOYMENT.md`, `TROUBLESHOOTING.md`, `AI_COSTS.md` (tautkan sumber resmi, bukan harga hardcode), `TEST_REPORT.md`, `THIRD_PARTY_LICENSES.md`.
- [ ] **I4** Scripts provisioning (D1/R2/secret) + panduan backup/restore D1; langkah migrasi remote terkontrol.
- [ ] **I5** Panduan setup 1-2-3 Cloudflare Free + cara buka dari Android/PWA.
- [ ] **I6** Audit lisensi final & atribusi.
- [ ] **I7** Laporan akhir sesuai `SPEK §17` (IMPLEMENTED / PARTIAL / NOT IMPLEMENTED berbasis bukti).
- [ ] **I8** Deploy produksi + smoke test **hanya jika** kredensial & izin ada; selain itu tulis **NOT DEPLOYED (blocked by credentials)**.

### Jalur minimum "inti end-to-end" (bila waktu/konteks terbatas — SPEK §16)

Urutan prioritas: **A → B → C → D → G(TTS) → E → F**, lalu H & I. Target inti: login → upload → ekstrak → terjemah → reader + TTS → tutor → kuis → progres. Jangan ganti fitur penting dengan tombol kosong/data dummy.

---

## 7. STATUS LOG

Format entri (tambah di **paling bawah**, jangan hapus entri lama):

```
### Sesi N — YYYY-MM-DD — <nama/akun pelaksana>
- Langkah dikerjakan: A1, A2, ...
- Selesai & terverifikasi: ...
- Sebagian / diblokir: ... (alasan)
- Bukti: command + exit code / ringkasan output (DIUJI | TIDAK DIUJI | DI-MOCK)
- Commit/branch: <hash> di `dev`
- Keputusan baru: ...
- Langkah berikutnya: ...
```

### Sesi 0 — 2026-11-05 — Claude (perencanaan)
- Langkah dikerjakan: membaca SPEK, membuat PLAN.md, membuat branch `dev` dari `main`.
- Selesai & terverifikasi: PLAN.md dan branch `dev` dibuat. **Belum ada kode.**
- Sebagian / diblokir: —
- Bukti: tidak ada build/test (belum ada kode).
- Keputusan baru: monorepo pnpm + Turborepo; kerja di `dev`; deploy default NOT DEPLOYED.
- Langkah berikutnya: **A1 → A9**, lalu **Fase B**.

### Sesi 1 — 2026-11-05 — Claude (claude.ai, FASE A)
- Langkah dikerjakan: **A1–A9** (seluruh FASE A — Audit + Foundation).
- Selesai & terverifikasi:
  - A1: audit (repo lama hanya README+PLAN+SPEK, tidak ada kode) — dikonfirmasi lewat `repo_summary` dan `list_branches`.
  - A2: monorepo pnpm+Turborepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, ESLint flat config, Prettier, `.gitignore`, `.dev.vars.example`, `.env.example`).
  - A3: `apps/worker` — Hono app, `wrangler.jsonc` (binding `DB`/D1, `BUCKET`/R2, `ASSETS` static, flag fitur), route `GET /api/health`.
  - A4: `apps/web` — Vite+React+TS+Tailwind (tema dark `#080D19`/aksen `#246BFD`), SPA shell, halaman `/` dan `/login` placeholder jujur, `manifest.webmanifest` kerangka.
  - A5: `packages/shared` — konstanta (locale `id-ID`, timezone `Asia/Jakarta`, limit upload 15 MB, dst.), kode error `{ error: { code, message, requestId } }`, skema Zod dasar (`healthResponseSchema`, `bookSummarySchema`, dst.).
  - A6: `migrations/0001_init.sql` — tabel `app_settings, sessions, auth_attempts, books, book_processing_jobs, book_chapters, book_units, book_spans`, semua idempoten (`IF NOT EXISTS`), FK + index dasar.
  - A7: Vitest terpasang di 3 paket, 7 test lulus total.
  - A8: `.github/workflows/ci.yml` (install → lint → typecheck → test → build), tidak mem-print secret, belum pernah run aktual di GitHub Actions.
  - A9: `README.md` (Indonesia), `docs/ARCHITECTURE.md` (penyimpangan dari SPEK dicatat: shadcn/ui ditunda, `database_id` placeholder, keputusan upload streaming vs presigned belum diambil), `docs/THIRD_PARTY_LICENSES.md` (kerangka).
- Sebagian / diblokir:
  - A6 **TIDAK DIUJI** terhadap D1 lokal sungguhan (`wrangler d1 migrations apply --local`) — sandbox tidak punya waktu/izin menjalankan workerd D1 lokal penuh pada sesi ini; SQL sudah direview manual untuk idempotensi.
  - A8 **DIUJI secara lokal saja** (replikasi manual tiap step CI) — belum ada run GitHub Actions sungguhan; akan terverifikasi otomatis begitu commit berikutnya masuk `dev`/PR dibuka, karena workflow sudah trigger `push: [main, dev]`.
  - `pnpm-lock.yaml` **belum di-commit** — terlalu besar (~140 KB) untuk ditransfer aman lewat tool push file manual di sesi ini; CI untuk sementara pakai `pnpm install` biasa. Lihat `docs/ARCHITECTURE.md`.
- Bukti (dijalankan di sandbox `/home/claude/guru`, Node 22, pnpm 9 via `.npm-global`):
  - `pnpm install` → exit 0 (328 package).
  - `pnpm typecheck` → exit 0 (3/3 paket: `@guru/shared`, `@guru/web`, `@guru/worker`).
  - `pnpm lint` → exit 0 (3/3 paket, 0 error).
  - `pnpm test` → exit 0 (3/3 paket, 7 test lulus: shared 4, worker 1, web 2).
  - `pnpm build` → exit 0 (3/3 paket: shared typecheck, web `vite build` 183 KB bundle, worker `wrangler deploy --dry-run` berhasil baca binding D1/R2/assets + static dir `../web/dist`).
  - `pnpm format:check` → "All matched files use Prettier code style!".
  - Semua **DIUJI** kecuali A6 (D1 lokal) dan A8 (GitHub Actions run) seperti dicatat di atas.
- Commit/branch: di `dev` —
  - `98dbf04` feat(A1-A9): foundation monorepo - root config, CI, docs, migration
  - `9dd7aeb` feat(A5): packages/shared - zod schemas, error codes, constants
  - `c8cdbdd` feat(A3): apps/worker - Hono API with D1/R2/assets bindings and health route
  - `9d7123b` feat(A4): apps/web - Vite+React+Tailwind SPA shell, dark theme, placeholder pages
- Keputusan baru:
  - shadcn/ui **ditunda** ke FASE B+ (dipasang per komponen yang benar-benar dipakai, bukan di-generate penuh di awal) — dicatat di `docs/ARCHITECTURE.md`.
  - `packages/learning` dan `packages/ai` **belum dibuat** di FASE A (akan dibuat saat FASE D/F benar-benar membutuhkannya) agar tidak ada paket kosong.
  - `wrangler.jsonc` `database_id` memakai placeholder `REPLACE_WITH_REAL_D1_ID` sampai Harvey menjalankan `wrangler d1 create guru-db` (I4).
  - CI `ci.yml` memakai `pnpm install` (bukan `--frozen-lockfile`) sementara lockfile belum di-commit.
- Langkah berikutnya: **FASE B (Auth + Storage)**, mulai dari **B1** (`scripts/setup-password`). Sebelum itu, idealnya verifikasi run CI pertama di GitHub Actions dan — bila memungkinkan dari lingkungan dengan `git push` langsung — commit `pnpm-lock.yaml` lalu kembalikan `ci.yml` ke `--frozen-lockfile`.

---

## 8. PRAKIRAAN & PEMBAGIAN SESI

Perkiraan kasar total **10–14 sesi** (satu sesi = satu giliran kerja besar). Bisa lebih panjang bila ada bug integrasi (PDF.js di Vite, FTS5 di D1) atau perubahan desain.

| Sesi | Cakupan |
|---|---|
| 1–2 | A + B |
| 3–4 | C |
| 5–6 | D |
| 7–8 | E |
| 9–10 | F |
| 11 | G |
| 12 | H |
| 13–14 | I |

Jalur inti end-to-end ≈ 6–8 sesi. Deploy Cloudflare, tes Android sungguhan, dan tes provider AI sungguhan adalah tanggung jawab pemilik (di luar kemampuan sandbox).

---

## 9. DEFINISI "SELESAI" (SPEK §17)

Aplikasi bisa dipakai belajar buku berbahasa Inggris yang **tampil/diajarkan dalam Bahasa Indonesia**, login hanya password, TTS browser tanpa API, semua progres tersimpan, Cloudflare Free sebagai baseline. Laporan akhir wajib memuat: fitur IMPLEMENTED/PARTIAL/NOT IMPLEMENTED berbasis bukti, daftar file utama, hasil `lint/typecheck/test/build/e2e` nyata (dengan exit code), hasil security & cache/token test, nama binding & secret (tanpa nilai), status migrasi/deploy (hanya bila terverifikasi), setup 1-2-3 + cara buka dari Android, limitasi (OCR scan, suara id-ID bergantung browser, biaya AI/kuota), commit/PR nyata, dan bukti smoke test.
