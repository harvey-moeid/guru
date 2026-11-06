# Keamanan — BYGA AI Guru Privat

Dokumen ini menjelaskan model ancaman dan kontrol yang **sudah diimplementasikan** (FASE B). Setiap klaim ditandai DIUJI (ada tes otomatis), atau TIDAK DIUJI (belum diverifikasi di lingkungan nyata).

## Model ancaman

Aplikasi single-user, diakses lewat internet publik di balik satu password. Ancaman utama: tebak password (brute force), pencurian/pemalsuan sesi, CSRF dari situs lain, akses anonim ke data buku, dan kebocoran secret.

## Autentikasi

- **Password-only.** Verifier = `HMAC-SHA-256(key = AUTH_PEPPER, msg = password)` dalam hex, dibandingkan dengan `AUTH_PASSWORD_HASH` secara waktu-konstan. DIUJI.
- **Batasan penting:** HMAC cepat, **bukan** pengganti hashing adaptif (bcrypt/argon2/scrypt). Keamanannya bergantung pada password **acak panjang** dan pepper yang rahasia. Karena itu `scripts/setup-password.mjs` mewajibkan minimal 24 karakter dan ~100 bit entropi (atau membuatkan password acak 32 karakter). **Jangan memakai password buatan sendiri yang mudah ditebak.** Bila pepper bocor bersama verifier, serangan offline terhadap password lemah menjadi cepat.
- Pesan error login generik ("Password salah"), tidak membedakan penyebab. Server yang belum dikonfigurasi menjawab 503 (tidak pernah meloloskan login). DIUJI.
- Rotasi password: jalankan ulang `scripts/setup-password.mjs`, set ulang tiga secret, lalu semua sesi lama menjadi tidak valid setelah `SESSION_SIGNING_SECRET` diganti (hash token tidak cocok lagi).

## Sesi

- Token acak 256-bit (Web Crypto). Di D1 hanya disimpan **hash HMAC** token (`SESSION_SIGNING_SECRET`), bukan token mentah. DIUJI.
- Cookie `guru_session`: `HttpOnly; Secure; SameSite=Strict; Path=/`, TTL 7 hari. DIUJI (atribut).
- Token dirotasi bila sesi lebih tua dari 24 jam; token lama langsung dicabut. Logout mencabut sesi di D1 (replay token lama ditolak). Sesi kedaluwarsa dan cookie yang dimanipulasi ditolak. DIUJI.
- Semua respons `/api/*` berisi `Cache-Control: no-store`. DIUJI.

## Rate limit dan lockout

- Percobaan login gagal dicatat di D1 (`auth_attempts`): maksimal **5 gagal per IP** dan **30 global** per jendela 15 menit, lalu 429 dengan `Retry-After` — bahkan jika password berikutnya benar. Login sukses mereset hitungan gagal IP tersebut. DIUJI.
- IP disimpan sebagai HMAC (bukan mentah); password tidak pernah dicatat. DIUJI.
- Catatan: IP diambil dari header `CF-Connecting-IP` (diisi Cloudflare). Di luar Cloudflare header ini bisa dipalsukan, namun batas global 30/15 menit tetap berlaku.

## CSRF, CORS, dan header

- Semua mutasi (`POST/PUT/PATCH/DELETE`) di `/api/*` wajib punya `Origin` (atau `Referer`) yang sama dengan origin Worker, dan `Sec-Fetch-Site` bukan `cross-site`; selain itu 403 `CSRF_FAILED`. DIUJI, termasuk login dan logout lintas-origin.
- CORS tidak diaktifkan (same-origin saja). DIUJI.
- Header: CSP (`default-src 'self'`, `frame-ancestors 'none'`, `worker-src 'self' blob:` untuk PDF.js), HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP. DIUJI untuk respons Worker. Untuk Static Assets, header yang sama ada di `apps/web/public/_headers` — **TIDAK DIUJI** di runtime Cloudflare; verifikasi setelah deploy pertama.
- CSP memakai `style-src 'unsafe-inline'` untuk Tailwind/React; `script-src` tetap `'self'` saja.

## Otorisasi

- Middleware global untuk `/api/*`: hanya `/api/health`, `/api/auth/login`, dan `/api/auth/logout` yang publik. Rute lain, termasuk yang belum ada, menjawab 401 tanpa sesi. DIUJI.
- Semua endpoint buku (daftar, detail, buat, unggah, hapus) menolak akses anonim. DIUJI.
- Bucket R2 **tidak pernah** dibuka publik; file hanya keluar lewat Worker setelah auth. Kunci R2 berbasis UUID (`originals/{id}/...`), nama file pengguna tidak pernah menjadi path, dan DTO API tidak membocorkan kunci R2. DIUJI.
- ID buku divalidasi sebagai UUID sebelum menyentuh D1/R2 (mencegah path traversal). DIUJI.

## Unggahan buku

- Batas 15 MB (cek saat membuat buku dan saat unggah). Content-Length wajib ada dan harus sama dengan ukuran yang dideklarasikan.
- Body di-stream langsung ke R2, tidak di-buffer di Worker. R2 memverifikasi SHA-256 yang dideklarasikan; setelah itu ukuran dan magic bytes (`%PDF-` untuk PDF, signature ZIP untuk EPUB) dicek. Gagal → objek dibuang dan status `failed`. DIUJI dengan R2 tiruan.
- **TIDAK DIUJI:** perilaku R2 asli (verifikasi checksum) dan batas CPU/memori Workers Free untuk file mendekati 15 MB. Bila ternyata melampaui batas, alternatifnya presigned PUT langsung dari browser ke R2.
- Penghapusan buku membersihkan prefix `originals/`, `extracted/`, `translations/` di R2 lebih dulu, baru baris D1 (cascade). Bila R2 gagal, D1 tidak disentuh sehingga bisa diulang. DIUJI.

## Secret

- Tiga secret login (`AUTH_PEPPER`, `AUTH_PASSWORD_HASH`, `SESSION_SIGNING_SECRET`) hanya lewat `wrangler secret put`. Jangan di-commit, jangan di D1, jangan di frontend/localStorage. `.dev.vars` dan `.env` ada di `.gitignore`.
- `scripts/setup-password.mjs` hanya mencetak ke terminal, tidak menulis file dan tidak menyimpan password.
- Log error hanya memuat request ID dan nama error, tanpa isi request, password, atau cookie.

## Belum tercakup (jadwal)

- Sanitasi HTML EPUB dan proteksi ZIP bomb (C2), deteksi konten tersembunyi (C7), proteksi prompt injection dan sitasi (E4/E5), budget guard AI (D9), tes isolasi data lanjutan (H6).
- Tes terhadap D1/R2/workerd nyata dan pengujian penetrasi nyata belum dilakukan.

## Melaporkan masalah

Proyek pribadi satu pemilik; catat temuan di Issues repo ini (jangan menaruh secret atau isi buku di Issue).
