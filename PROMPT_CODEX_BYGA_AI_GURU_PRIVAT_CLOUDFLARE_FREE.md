# PROMPT CODEX CLOUD — BYGA AI GURU PRIVAT

> **Tempelkan seluruh isi dokumen ini sebagai satu tugas di Codex Cloud pada repository tujuan.**
> Versi spesifikasi: 1.0 · Target: production single-user · Prioritas: Cloudflare Free · Bahasa aplikasi: Indonesia.

## 0. PERAN, MISI, DAN CARA KERJA

Anda adalah **Principal Full-Stack Engineer + Cloudflare Architect + AI Learning Engineer + Security Engineer + QA Engineer**. Kerjakan **implementasi nyata sampai versi akhir yang dapat diuji** di repository yang sedang dibuka. Jangan berhenti pada ide, PRD, mockup statis, pseudocode, atau scaffolding kosong. Buat source code, migration, test, dokumentasi, GitHub Actions, dan konfigurasi deployment. Lakukan iterasi memperbaiki error sampai pemeriksaan yang dapat dijalankan di lingkungan ini lulus.

**Misi:** Bangun aplikasi web/PWA pribadi bernama **BYGA AI Guru Privat** untuk mengunggah buku berbahasa Inggris (PDF/EPUB), membaca versi Bahasa Indonesia, belajar dari tutor AI secara Socratic **bab demi bab**, mengikuti kuis adaptif dan review, serta mendengarkan teks dan jawaban tutor memakai **Text-to-Speech bawaan browser**. Hanya satu pengguna dan cukup satu password. Hosting backend dan frontend di **Cloudflare Workers Free** dengan D1 dan R2; Vectorize dan Workflows adalah enhancement **opsional sesuai kuota**, bukan dependency agar aplikasi bisa hidup.

### Instruksi operasional

1. Audit struktur, branch, status Git, package manager, workflow, dependensi, lisensi, dan konfigurasi repo terlebih dahulu. Jika repo kosong, inisialisasi sesuai rancangan. Jika sudah ada aplikasi, manfaatkan bagian yang relevan dan lakukan migrasi tanpa merusak data atau fungsi yang tidak terkait.
2. Gunakan dokumentasi **Cloudflare terbaru saat implementasi**, bukan angka yang diingat: Workers Free limits, D1, R2, Vectorize, Workflows, Workers AI, Static Assets, Wrangler, serta syarat GitHub Actions. Pastikan kompatibilitas dengan plan Free, termasuk **batas CPU 10 ms/request** dan subrequest. Hindari operasi berat pada Worker.
3. Boleh mengambil inspirasi desain dan algoritma dari:
   - OpenTutor: https://github.com/zijinz456/OpenTutor
   - Project Schola: https://github.com/OJ102/ProjectSchola
   Audit LICENSE dan provenance sebelum menyalin kode. OpenTutor berlisensi MIT. Project Schola memiliki bagian turunan yang tidak otomatis berlisensi MIT; **jangan salin bagian dengan hak tidak jelas**. Buat implementasi orisinal untuk Cloudflare jika perlu, dokumentasikan atribusi kode yang memang digunakan.
4. **Bertindak, bukan hanya menjelaskan**: tulis file, implementasikan API/UI/persistence, tes, perbaiki bug, siapkan migration/deploy. Jangan meminta pengguna memilih hal yang sudah diputuskan dalam prompt ini. Ambil keputusan engineering paling aman bila detail minor belum ada.
5. **Jangan mengarang hasil**: klaim build, API, migration, GitHub Actions, atau deployment sukses hanya jika benar-benar dieksekusi dan diverifikasi. Jika Cloudflare credential/permission tidak tersedia, jangan bypass; tetap selesaikan seluruh source + workflow dan berikan instruksi setup yang tepat, serta laporkan bagian yang belum dapat diuji.
6. Target **production langsung**, tanpa lingkungan staging wajib. Jangan melakukan perubahan resource Cloudflare produksi yang tidak diminta atau migrasi destruktif tanpa backup. Gunakan guard verifikasi, rollback, dan smoke checks; production deploy hanya jika token, resource, dan izin tersedia. Jangan commit secret, password, ID akun nyata, isi buku pribadi, atau file `.env` nyata.
7. Bahasa antarmuka, penjelasan tutor, kuis, kesalahan, dan dokumentasi adalah **Bahasa Indonesia**. Teks Inggris disimpan sebagai sumber asli. Default locale `id-ID`, timezone `Asia/Jakarta`.
8. Utamakan keamanan, aksesibilitas, kinerja Android kelas entry-level, biaya Rp0 selama dalam free quota, dan desain yang benar-benar bisa digunakan setiap hari.

---

## 1. HASIL AKHIR WAJIB

Aplikasi yang dapat:

- Login **single-user password-only** dan logout, tanpa email, OAuth, Google login, pendaftaran, undangan, atau manajemen banyak pengguna.
- Upload PDF berbasis teks dan EPUB berbahasa Inggris, dengan limit default kecil yang aman dan pesan kesalahan jelas untuk dokumen bermasalah. Simpan file asli di R2 privat.
- Ekstrak teks **di browser** agar Worker Free tidak perlu parse PDF/EPUB yang berat. Susun TOC (bab, subbab), sumber halaman/paragraf, dan simpan dalam batch kecil. Sertakan deteksi PDF hasil scan dan penanganan yang jujur.
- Menampilkan buku sebagai **reader HTML Bahasa Indonesia**, menerjemahkan **on-demand per bab atau unit**, menyimpan terjemahan di R2, dan menyediakan mode Indonesia / English Original / Bilingual. Jangan memodifikasi atau mengklaim telah menerjemahkan layout PDF asli.
- Tutor AI yang *grounded* pada buku, sitasi klik-ke-sumber, pertanyaan Socratic, probe pengetahuan, penjelasan bertahap, deteksi miskonsepsi, serta belajar unit demi unit mengikuti urutan buku.
- Kuis adaptif (pilihan ganda, benar/salah, jawaban singkat), penilaian deterministik untuk soal objektif, evaluasi terstruktur/rubrik untuk teks terbuka, penguasaan per konsep, rekomendasi remedial, dan kondisi siap lanjut ke unit selanjutnya.
- Flashcards dan spaced repetition (FSRS atau implementasi algoritma review teruji), jadwal review, histori jawaban, dan progres yang persisten di D1.
- Native browser TTS memakai `speechSynthesis` — bacakan terjemahan Indonesia dan jawaban tutor **tanpa API TTS dan tanpa token TTS**.
- Dashboard pengaturan AI: provider per tugas, fallback, model, endpoint jika relevan, status koneksi, anggaran/kuota, pemakaian token/neuron, histori panggilan (tanpa membocorkan buku atau credential), dan saklar fitur hemat.
- UI premium futuristik mobile-first, dark/light, aksen `#246BFD` di atas latar gelap `#080D19`, font sistem fallback, nyaman pada Android, mendukung PWA.
- Validasi end-to-end, migrasi database, GitHub Actions, README Bahasa Indonesia, instruksi konfigurasi Cloudflare Free, troubleshooting, dan laporan tes.

**Non-goals:** tidak membuat SaaS, paket langganan, pembayaran, pengguna kedua, aplikasi APK native, backend Docker wajib, Cloudflare Containers, server OCR berbayar, atau voice cloning. Jangan membuat cloud TTS sebagai dependency. EPUB/PDF yang dilindungi DRM tidak perlu dibobol.

---

## 2. ARSITEKTUR YANG DIPILIH

Gunakan **TypeScript monorepo** (npm workspaces atau pnpm jika tepat) dengan struktur yang terorganisasi:

```
/apps/web                React + Vite + TypeScript + Tailwind + shadcn/ui
/apps/worker             Hono + TypeScript + Cloudflare Workers API
/packages/shared         Zod schemas, DTO, tipe, konstanta
/packages/learning       algoritma penilaian, mastery, review murni
/packages/ai             adapter, routing, prompts, cost/usage policy
/migrations              migrasi SQL Cloudflare D1
/scripts                 setup, password secret generator, smoke test
/tests                   unit/integration/e2e + fixtures non-copyright
/docs                    arsitektur, operasional, keamanan, keputusan
/.github/workflows        CI dan production deploy
```

**Deploy satu Worker bila kompatibel** menggunakan Workers Static Assets untuk web SPA + Worker API pada domain sama; hindari SSR berat. Boleh menyesuaikan folder, tetapi jaga tanggung jawab jelas dan dokumentasikan perubahan. Gunakan `wrangler.jsonc` atau `wrangler.toml` dan binding D1/R2. Semua static asset sebaiknya langsung disajikan sebagai aset, bukan lewat runtime Worker API.

### Layanan

- **Worker**: API auth, metadata, chat ringan, streaming bila bisa, koordinasi AI, penerimaan hasil ekstraksi, validasi akses dan pemanggilan storage.
- **D1**: metadata, TOC, indeks teks secukupnya, sesi login, status pemrosesan, progress, kuis, mastery, review, usage, konfigurasi nonrahasia.
- **R2**: buku original, hasil ekstraksi berstruktur, terjemahan per bab/unit, artifact untuk ekspor/backups. Bucket privat. Kunci objek berbasis UUID dan prefix yang aman.
- **Vectorize**: **opsional** semantic retrieval. Jika binding/embedding belum tersedia atau kuota habis, otomatis gunakan D1 FTS5 (atau exact/full-text text search yang diuji).
- **Workflows/Queues**: **opsional** untuk background task kecil; baseline wajib berfungsi menggunakan antrean job dan checkpoint D1 + proses per-batch dari browser yang sedang membuka aplikasi. Jangan membutuhkan cron aktif atau infrastructure berbayar.
- **AI model**: Workers AI binding jika layak + adapter Gemini, OpenRouter, Groq, dan OpenAI-compatible jika dikonfigurasi. AI Gateway boleh dipakai bila memang membantu dan konfigurasi tersedia. Tanpa credential/model sehat, aplikasi tetap bisa membaca buku asli, terjemahan yang tersimpan, progres, dan flashcard yang sudah ada; tampilkan status AI unavailable, bukan membuat jawaban palsu.
- **TTS**: Web Speech API pada perangkat pengguna; tidak membutuhkan Worker, R2 audio, atau layanan AI suara.

### Mode hemat yang wajib aktif default

- Terjemahkan satu bab/unit hanya saat pengguna menekan Mulai/Baca atau meminta prefetch.
- Satu terjemahan yang sudah sukses disimpan dan tidak diterjemahkan ulang sampai teks/prompt/model/setting glossary berubah.
- Gunakan budget guard di backend; jangan hanya menghitung di frontend.
- Kirim hanya sumber relevan ke AI Tutor, bukan seluruh buku atau riwayat chat tanpa batas.
- Kuis objektif dinilai di kode tanpa panggilan AI.
- Batasi context panjang, biaya perkiraan per request, retry, concurrency, dan total panggilan per hari.

---

## 3. LOGIN SINGLE USER YANG AMAN DI WORKERS FREE

**Tidak ada tabel users multi-user atau fitur register**. Hanya satu pemilik aplikasi.

- Halaman `/login` hanya meminta **password**; tidak ada username, email, OAuth, atau tombol pendaftaran.
- **Jangan** menaruh password/hash verifier yang dapat diuji publik dalam bundle frontend, JS, localStorage, URL, file repo, atau wrangler vars plaintext.
- Buat `scripts/setup-password` untuk membuat password acak kuat minimal **24–32 karakter** atau memvalidasi password buatan pemilik yang panjang dan entropinya cukup; cetak instruksi memasukkannya ke Cloudflare secret dengan aman. Rahasia hanya di Wrangler secrets, tidak pernah di source.
- Gunakan verifikasi kriptografis yang aman dalam batas CPU Workers Free: contoh **HMAC-SHA-256 dengan server-side secret pepper** terhadap password yang memiliki entropi tinggi, secret terpisah untuk verifier dan signing session, perbandingan constant-time untuk hasil yang sama panjang. Jelaskan di SECURITY.md bahwa HMAC cepat **bukan pengganti password hashing adaptif untuk password manusia yang lemah**; karena itu wajib password acak berentropi tinggi dan perlindungan brute force. Jika Argon2id/PBKDF2 yang benar dapat dijalankan dalam batas Free secara terbukti, boleh menggantinya. Jangan diam-diam menggunakan hash cepat untuk password pendek.
- Session dengan token acak opaque dan hash token di D1, atau token berintegritas yang dapat dicabut dengan mekanisme state aman. Cookie `HttpOnly`, `Secure`, `SameSite=Strict`/Lax sesuai kebutuhan, path benar, TTL terbatas, session rotation, logout benar-benar invalidates; gunakan `Cache-Control: no-store` untuk data privat.
- Periksa Origin/CSRF untuk mutasi, CORS ketat same-origin, rate limiting pada endpoint login + lockout yang persisten dengan pengukuran stabil (D1) dan optional Turnstile jika berguna. Jangan merekam password dalam log.
- Semua endpoint buku/terjemahan/progres/AI harus lewat autentikasi server dan otorisasi owner, bukan menyandarkan pada hidden UI.
- Sediakan ganti password/rotasi secret dengan instruksi operasional aman; reset membutuhkan akses ke secret/deploy, bukan email.
- Uji salah password, brute-force, cookie tampering, expiry, logout, replay, CSRF, akses tanpa login, dan perlindungan sumber R2.

---

## 4. INGESTION BUKU PDF/EPUB DI BROWSER

### Browser processing

1. Upload dialog: drag-drop/file picker, validasi ukuran default awal **maks. 15 MB** (konfigurabel), ekstensi, MIME/sniffing signature, checksum SHA-256 melalui Web Crypto bila feasible, dan status pemrosesan.
2. Untuk PDF text-layer gunakan **PDF.js** dalam Web Worker browser; pilih library dan worker asset yang berjalan di Vite/Android. Ekstrak halaman dan `getTextContent`, pertahankan nomor halaman asli, urutan baca secara best effort, dan beri indikator bila multi-column/table tidak pasti.
3. Untuk EPUB gunakan parser browser yang teruji (mis. epub.js/JSZip/DOMParser sesuai lisensi), ambil spine/nav TOC dan konten semantik. Sanitize HTML dengan sanitasi tepercaya; jangan menjalankan script atau remote resource dari EPUB.
4. Deteksi buku bahasa Inggris; siapkan parser Unicode dan heading. Ambil daftar isi native bila ada; fallback heading heuristics. **Pengguna dapat mengoreksi TOC dan membagi/merapikan bab** bila deteksi otomatis gagal. Jangan mengarang judul bab.
5. Buang hidden/invisible content yang mencurigakan bila terdeteksi, simpan warning, cegah EPUB ZIP bomb, file invalid dan PDF password-protected dengan pesan jelas. Perlakukan konten buku sebagai DATA, bukan instruksi AI.
6. Bagi teks menjadi **source spans** dan **unit** dengan ID stabil; mapping `book_id/chapter_id/unit_id/span_id`, `page_index`, `printed_page_label` bila benar-benar diperoleh, paragraph offset, original text, content hash. Bedakan halaman fisik PDF dari nomor halaman cetak yang mungkin berbeda.
7. Jalankan parsing dalam Web Worker supaya UI Android tetap responsif; buffer kecil, yield, progressive status dan cancellation. Jangan pernah mengirim seluruh buku dalam satu request JSON.
8. Kirim batch kecil yang tervalidasi (mis. 10–50 KB teks/request atau ukuran aman hasil benchmark) ke endpoint terautentikasi; lakukan checkpoint, retry dengan backoff, idempotency key dan deduplikasi. Atur concurrency rendah agar Worker Free tidak overload.
9. Simpan original file secara privat ke R2. Pilih implementasi yang dapat lolos batas Worker: direct streaming `request.body` ke R2 binding untuk file kecil **jika lulus uji CPU/memory**; atau presigned PUT R2 S3 untuk direct upload (ditandatangani server dengan secret, CORS terkontrol, TTL singkat). Jangan buffer seluruh file di Worker. Jangan expose API key R2 ke browser. Validasi metadata & keberadaan objek via backend.
10. Status buku: `created -> uploading -> extracting -> outline_review -> ready`, juga `failed/cancelled`. Hasil parsial tidak boleh dianggap lengkap. Resume upload/ingestion tanpa menduplikasi bab.
11. PDF scan tanpa text layer: berikan pesan eksplisit dan pilihan **OCR client-side opsional yang benar-benar diuji** (mis. Tesseract.js, dibatasi halaman/ukuran agar Android low-memory tidak crash), atau tampilkan fitur unsupported dengan langkah ekstrak PDF melalui aplikasi lain. **Jangan menyatakan OCR full scan berhasil jika belum diimplementasikan/diuji.**
12. Pastikan penghentian atau refresh tab tidak merusak buku: checkpoint D1 dan status resume; bagi batch agar bisa dilanjutkan saat browser kembali dibuka.

### Storage

- `original/{bookUuid}/source.pdf|source.epub`
- `extracted/{bookUuid}/{version}/chapter-{chapterUuid}.json.gz` jika compression layak
- `translations/{bookUuid}/{targetLocale}/{version}/{unitUuid}.json`
- `exports/{bookUuid}/...` untuk fitur ekspor bila dibuat.

Semua akses file wajib di-proxy oleh endpoint authenticated atau signed object URL pendek yang scoped dan tak menjadi public bucket.

---

## 5. TRANSLATION ENGINE: INGGRIS -> BAHASA INDONESIA

Wajib default bahasa antarmuka dan bacaan `id-ID`, tetapi simpan **original English immutable**.

- Terjemahkan **per unit atau bab on demand**. Batas chunk mengikuti limit konteks model dan tanda paragraf; jangan memotong kalimat secara sembrono. Biarkan pengguna membaca bab lain hanya setelah diproses, atau tampilkan state progress jujur.
- Tombol reader: **Indonesia | Original English | Bilingual**, dengan toggle istilah teknis/aslinya bila diperlukan.
- Gunakan instruksi terjemahan: mempertahankan makna, konteks, angka, istilah penting, judul, daftar, rumus, kutipan pendek yang diperlukan, dan label gambar. Jangan mengarang teks yang tidak ada. Glosarium bilingual per buku bisa diedit.
- Implementasi output JSON terstruktur berbasis source-span ID agar setiap paragraf terjemahan tetap terhubung ke original. Simpan alignment 1:N bila teks harus digabung/dipecah, dan sertakan status kualitas/ketidakpastian. Jangan hanya menyimpan satu blob tanpa mapping.
- Cache key = hash(text asli + target locale + model identity + translator prompt version + glossary version + settings). Hindari terjemahan ulang bila cache sama; jika gagal, jangan menandai `ready`.
- Verifikasi numerik/dates dan keselarasan span, deteksi paragraf hilang, duplikasi, output kosong, JSON invalid. Retry terbatas, fallback model bila memang dikonfigurasi, dan mekanisme edit manual terjemahan. Jika terjemahan buruk, tampilkan teks asli agar tak menyesatkan.
- Terjemahan disimpan R2 dan metadata status di D1. Tidak ada token saat membuka ulang hasil terjemahan.
- Default **tidak menerjemahkan semua buku sekaligus**. Prefetch satu unit berikutnya boleh dilakukan di bawah token budget setelah pengguna menyetujui mode terkait.
- Jangan mengklaim PDF asli telah diganti ke Bahasa Indonesia. Reader HTML terpisah dari file PDF original. Ekspor PDF terjemahan opsional, tidak perlu menjadi bagian blocking produksi.

---

## 6. RAG, PENCARIAN, DAN SITASI YANG TERUJI

- Baseline wajib **D1 FTS5** untuk teks buku (simpan excerpt/token index ringkas, bukan seluruh buku dalam tabel besar jika dapat dihindari). Jika FTS5 tidak didukung oleh versi runtime lokal/produksi, implementasikan fallback deterministik teruji.
- **Vectorize opsional**: embedding hanya jika binding dan model kompatibel. Dimensi vektor indeks harus sama dengan dimensi model. Namespace per book (single user), simpan metadata `bookId`, `chapterId`, `unitId`, `spanId`; cek batas indeks/namespace dan kuota Free secara nyata. Jika limit/retrieval error, fallback FTS tanpa crash.
- Retrieval utama dibatasi **book dan active chapter/unit** + prasyarat, meluas lintas bab hanya bila pengguna meminta atau konteks perlu. Hybrid rank BM25/keyword + semantic, lalu rerank murah jika perlu. Context bounded.
- Seluruh jawaban tutor yang menyebut isi buku memiliki sitasi ke **span ID valid** yang ditemukan kode. Lokasi halaman diturunkan dari metadata sumber oleh backend, **bukan ditulis bebas oleh AI**.
- Validasi kecocokan kutipan terhadap source span; kalau tidak valid, buang sitasi dan jangan pura-pura tahu. Klik sitasi harus scroll/highlight passage original dan/atau terjemahan terkait.
- Bedakan pernyataan `berdasarkan buku`, `penjelasan tambahan AI`, dan `tidak ditemukan dalam buku`. Tambahan dari luar buku harus diberi label jelas.
- Perlindungan prompt injection: teks PDF/EPUB tidak dapat memerintah model untuk membocorkan secret, mengganti aturan, atau memanggil endpoint admin. Sanitasi, delimit data, schema output, dan izin server-side.
- Penghapusan buku membersihkan object R2, indeks FTS, vector index (jika dipakai), quiz/progress dan task yang terkait secara konsisten atau via job deletion dengan status transparan.

---

## 7. AI GURU PRIVAT: METODE SOCRATIC BAB DEMI BAB

Implementasi stateful tutor session dengan state yang **dikelola backend**. Alur per buku:

`Book ready -> pilih bab -> probe pengetahuan -> susun unit/konsep -> penjelasan singkat -> contoh/analogi -> tanya pemahaman -> penilaian -> remedial / lanjut konsep -> kuis mastery -> review terjadwal -> bab berikutnya`.

### Perilaku guru

1. Selalu Bahasa Indonesia yang natural, jelas, tidak kaku, tidak bertele-tele; istilah asli English boleh ditampilkan dalam kurung saat pertama kali muncul.
2. Sebelum mulai bab pertama, gunakan diagnostic 3–5 pertanyaan (adaptive, dengan penghentian yang masuk akal). Jangan terlalu sering mengulang probe kalau progres sudah tersimpan.
3. Ajar satu konsep penting per interaksi. Tanyakan pengguna untuk menjelaskan dengan kata sendiri; berikan hint bertahap alih-alih langsung membocorkan jawaban, **kecuali pengguna eksplisit meminta jawaban langsung**.
4. Setiap konsep memiliki tujuan belajar, prerequisite, evidence spans, contoh, miskonsepsi umum, dan status mastery.
5. Jika jawaban salah, klasifikasikan jenis kesalahan berdasarkan rubrik lalu beri remedial dan latihan baru yang setara, tidak mengulang pertanyaan yang sama secara verbatim.
6. Jangan menyalakan jawaban otomatis untuk kuis yang masih berlangsung. Berikan feedback dan pembahasan sesuai fase.
7. Sediakan tombol **Jelaskan lebih sederhana**, **Beri analogi**, **Tanya dari buku**, **Ulang konsep**, **Latihan lagi**, **Lanjut unit**, **Buka sumber**.
8. Simpan message dan ringkasan bounded untuk sesi aktif. Jangan masukkan seluruh chat ke setiap request. Kompres ringkasan bila perlu tanpa menghapus log untuk pengguna.
9. Semua respons harus tangguh terhadap provider timeout, context truncation, format invalid; AI unavailable tidak boleh menghilangkan attempt/progress.
10. Implementasikan prompts secara terpisah, versioned, dengan output Zod schema dan test adversarial.

---

## 8. ADAPTIVE QUIZ, MASTERY, SPACED REPETITION

### Kuis

- Tipe minimum: **single-select 4 pilihan**, **true/false**, dan **jawaban singkat**.
- Semua pertanyaan serta pembahasan dalam Bahasa Indonesia dengan istilah teknis sesuai aslinya bila penting.
- Generate menggunakan hanya bab/unit yang sesuai dan validasi semua jawaban terhadap sumber.
- Kunci dan rubrik tersimpan di backend; API tidak mengirim kunci benar sebelum pengumpulan. Acak posisi pilihan; hindari beberapa jawaban valid untuk single-select.
- Nilai MCQ dan true/false deterministik di backend. Untuk jawaban singkat, gunakan rubric + model jika tersedia, simpan reasoning/evidence ringkas dan skor uncertainty; gunakan fallback review manual atau `pending_review` bila model offline.
- Setiap jawaban menyimpan attempt id, question id/version, jawaban, skor, hint used, timestamp, indikator confidence, dan feedback.

### Adaptive mastery

- Implementasi BKT sederhana dengan parameter yang eksplisit (`prior`, `learn`, `guess`, `slip`) per konsep; hitung perubahan probabilitas berdasarkan hasil observasi. Clamp nilai dan uji properti matematika; parameter awal hanya heuristik, **jangan mengklaim angka mastery sebagai diagnosis tervalidasi**.
- Gabungkan BKT dengan kriteria lulus yang masuk akal: konsep penting mencapai threshold configurable (default misalnya 0.85), setidaknya **dua bukti pertanyaan independen tanpa hint** untuk konsep kritis, soal transfer berbeda, dan tidak mengabaikan miskonsepsi unresolved.
- Tingkat kesulitan naik/turun berdasarkan kemampuan. Kegagalan men-trigger remedial pada prerequisite; lulus membuka unit selanjutnya, namun pengguna boleh meninjau ulang kapan saja.
- Sediakan fitur override/pengulangan manual untuk pemilik, dengan riwayat jika skor berubah.

### Flashcards/review

- Generate flashcards dari konsep dan sumber; simpan prompt, jawaban, span refs, versi konten.
- Gunakan **FSRS** dari implementasi open-source kompatibel/teruji atau algoritma review yang sama-sama terukur dan dokumentasikan tradeoff; jangan membuat klaim FSRS jika yang dipakai hanya daftar 1/3/7 hari.
- Review queue Today/Overdue, penilaian Again/Hard/Good/Easy, update due date sesuai timezone `Asia/Jakarta`, anti-duplikat review.
- Progress dashboard: jumlah buku, bab, unit, mastery per konsep, quiz accuracy, review due, streak opsional, dan halaman/posisi terakhir.

---

## 9. TEXT-TO-SPEECH BAWAAN BROWSER (WAJIB, TANPA API)

Implementasi module frontend `BrowserSpeechService` menggunakan:

- `window.speechSynthesis`, `SpeechSynthesisUtterance`, `speechSynthesis.getVoices()`, dan `voiceschanged`.
- Bahasa default `id-ID`, pilih suara Indonesia jika tersedia; tampilkan daftar voice valid yang disediakan browser/perangkat; fallback yang jujur jika id-ID tidak tersedia. Jangan menyatakan suara pasti natural/offline.
- Bacakan teks terjemahan per paragraf/unit dan jawaban AI Guru; tidak perlu generate/upload audio. Tidak menggunakan token AI tambahan ketika teks sudah tersedia.
- Kontrol **Play, Stop, Pause/Resume jika didukung, Prev/Next paragraf, speed 0.75x / 1x / 1.25x / 1.5x**, selector suara dan highlight paragraf aktif.
- Split text secara sentence/paragraph agar engine Android tidak memotong teks panjang. Jangan memanggil `speak()` dengan seluruh bab dalam satu utterance.
- Track `onstart/onend/onerror`, handle perubahan voice, unmount, re-render, route changes, hidden tab, refresh, cancel, dan tidak menyisakan queue duplikat. Di Android, `pause/resume` bisa tidak konsisten: sediakan fallback melanjutkan dari paragraf tersimpan alih-alih berpura-pura pause akurat.
- Simpan posisi baca dan konfigurasi pengguna. Perintah mulai audio perlu user gesture jika browser mensyaratkan. Pemutaran dapat terhenti saat tab/browser ditangguhkan; tampilkan pesan realistis.
- Sanitasi/normalize teks untuk ucapan (Markdown, rumus, URL) tanpa merusak naskah. TTS hanya membaca **teks yang sudah ditampilkan**, bukan membuat jawaban baru di belakang layar.
- Feature detection dan graceful disabled state jika `speechSynthesis` tidak tersedia.
- E2E dapat menggunakan mock Web Speech API; tambahkan manual testing checklist Android Chrome/Browser Samsung.

---

## 10. DASHBOARD, UX, DAN PWA

Brand **BYGA AI Guru Privat**. Mobile-first untuk Samsung/Android entry-level. Tidak perlu WebGL, animasi berat, atau efek berlebihan.

Halaman utama:

1. `/login`: password-only, show/hide toggle, pesan invalid sederhana, loading, tanpa petunjuk password.
2. `/library`: daftar buku, upload, progres penerjemahan dan belajar, hapus dengan confirm.
3. `/books/:id`: struktur bab, status processed/translated, tombol Baca, Mulai Belajar, Lanjut.
4. `/books/:id/read/:chapterId`: reader HTML Indonesia/English/Bilingual, source link, selection -> Tanya Guru, TTS controls, posisi terakhir.
5. `/study/:bookId/:unitId`: tutor chat Socratic, sumber terverifikasi, hint, mode fokus, tombol lanjut.
6. `/quiz/:sessionId`: soal adaptif, hasil, alasan per pilihan, remedial.
7. `/reviews`: flashcard antrian due, review per hari.
8. `/progress`: mastery konsep, kemajuan tiap bab, keterlambatan review, token usage.
9. `/settings`: tema, language fixed default ID, voice, rate, mode hemat, provider status dan secrets setup guidance, daily budget, logout, password rotation instructions.

UI: responsive, keyboard navigation, semantik ARIA, loading skeleton, error/retry state, empty states nyata, mobile touch targets, font scalable, safe-area inset, download-safe PWA manifest dan icon yang dibuat secara legal. Tema light/dark, default dark `#080D19`, aksen `#246BFD`. Tidak gunakan assets pihak ketiga yang lisensinya tidak cocok.

---

## 11. MODEL AI, FALLBACK, DAN PEMBATASAN KONSUMSI

- Provider adapter interface seragam dengan methods generate structured JSON / generate stream, supported models capability map, timeout, circuit breaker, dan retry exponential backoff **hanya idempotent**.
- Dukungan minimal: Workers AI (bila binding ada) + satu external OpenAI-compatible provider yang dapat mencakup OpenRouter/Groq; adapter Gemini terpisah jika perlu perbedaan API. Secret disimpan hanya di Cloudflare.
- Routing per task: `translator`, `tutor`, `quiz_generator`, `essay_grader`, `concept_extractor`, `embedding`.
- Priority fallback dipilih lewat pengaturan yang disimpan D1 untuk **konfigurasi nonrahasia**; jangan pernah menyimpan raw API keys dalam D1 maupun frontend. Rahasia masuk `wrangler secret put` atau GitHub Actions secrets (workflow secrets tidak pernah diprint).
- Tracking input/output token berdasarkan provider usage jika tersedia; estimasi yang jelas berlabel jika tidak. Untuk Workers AI, periksa model pricing/Neurons dan jangan samakan langsung Neurons dengan token.
- Daily AI call cap, token cap, estimated spend cap, per-book cap, concurrency 1–2, caching, model max output, dan hard stop sebelum melewati budget. Kuota reset timezone ditetapkan dengan jelas; bila berbeda dari provider reset, tampilkan keduanya secara transparan.
- Safe fallback: bila seluruh provider tidak tersedia, **jangan menghasilkan teks seolah AI menjawab**. Tetap berikan sumber yang tersedia, non-AI quiz dari bank pertanyaan tersimpan, dan status layanan.
- Dashboard menampilkan health check real-time opt-in, status konfigurasi, panggilan terakhir, error aman, budget, dan tombol test provider (memerlukan izin dan mengonsumsi kuota; UI beri konfirmasi).
- Prompt caching, deduplikasi request, versioning prompt, dan chunk cache. Jangan kirim buku penuh ke provider; hanya unit/spans diperlukan.
- Jangan menjanjikan benar-benar gratis selamanya. Cloudflare Free dan provider memiliki batas. Jika kuota habis, beri pesan dan resume setelah quota reset/provider lain tersedia.

---

## 12. D1 SCHEMA, R2, API, ERROR MODEL

Buat migrasi idempotent/bernomor (bukan query manual saja) dan indeks yang dibutuhkan. Entitas minimal:

- `app_settings`, `sessions`, `auth_attempts`
- `books`, `book_processing_jobs`, `book_chapters`, `book_units`, `book_spans`
- `chapter_translations`, `glossary_terms`, `translation_jobs`
- `concepts`, `concept_prerequisites`, `learning_sessions`, `study_messages`
- `quiz_questions`, `quiz_attempts`, `concept_mastery`
- `flashcards`, `flashcard_reviews`, `review_schedule`
- `ai_provider_settings`, `ai_usage`, `ai_request_log`, `job_events`
- `book_search_fts` (bila FTS5 tersedia pada target)

Semua foreign key dan unique constraint, cascading/deletion, indeks query, migration check, `created_at/updated_at`, content version, dan status job harus benar-benar diuji pada D1. Karena single-user, **tidak perlu multi-tenant complexity**; pemilik tunggal tetap wajib authentikasi untuk setiap resource. D1 Free memiliki limit database dan quota, jadi simpan konten panjang sebagai object R2.

API minimal (boleh penamaan diperbaiki asalkan dokumentasi OpenAPI setara):

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session
GET    /api/health
GET    /api/books
POST   /api/books
POST   /api/books/:id/upload
POST   /api/books/:id/ingest-batch
POST   /api/books/:id/finish-ingest
GET    /api/books/:id/status
GET    /api/books/:id/chapters
GET    /api/books/:id/chapters/:chapterId
DELETE /api/books/:id
POST   /api/chapters/:id/translate
GET    /api/chapters/:id/translation/status
POST   /api/chapters/:id/translation/step
GET    /api/chapters/:id/translation
POST   /api/study/:unitId/start
POST   /api/study/:sessionId/chat
POST   /api/quiz/:unitId/generate
POST   /api/quiz/:quizId/submit
GET    /api/reviews/due
POST   /api/reviews/:reviewId/grade
GET    /api/progress
GET    /api/settings
PUT    /api/settings
POST   /api/admin/providers/test
GET    /api/admin/usage
```

Gunakan Zod/request validation, descriptive errors (`UNAUTHENTICATED`, `INVALID_FILE`, `PROCESSING`, `AI_NOT_CONFIGURED`, `AI_QUOTA_REACHED`, `TRANSLATION_NOT_READY`, `RETRYABLE`, `RATE_LIMITED`), correct HTTP status, request IDs, pagination, idempotency untuk mutasi, dan pembatasan body size. Tidak ada API debug atau bootstrap terbuka di production.

---

## 13. SECURITY, PRIVACY, RELIABILITY

- Worker dan R2 privat; tidak ada public URL permanen untuk buku, chapter, translation atau AI logs.
- Security headers (CSP yang kompatibel PDF.js/worker, nosniff, frame-ancestors, referrer policy, HSTS saat HTTPS), XSS-safe rendering, EPUB HTML sanitization, download filename sanitization.
- CSRF/Origin, cookie HttpOnly/Secure, token rotation, log redaction, rate limiting; tidak mengekspos API key AI/R2, pepper, password, isi soal sebelum waktunya.
- Proteksi berkas rusak, EPUB ZIP traversal/zip bomb, XSS dari EPUB, prompt injection dari buku, overly-long output, hallucinated citations, invalid JSON response.
- Hapus buku secara menyeluruh, opsi export metadata/progres/terjemahan untuk backup pribadi. Data penghapusan harus diverifikasi.
- No external tracking/analytics. Logging minimal dan sanitasi. Hindari menyimpan buku dalam log atau mengirim full book ke layanan tanpa perlu.
- Hanya kirim cuplikan yang diperlukan ke provider AI eksternal. Jelaskan kebijakan data provider yang dipilih agar pengguna memahami data yang keluar.
- Retry jobs idempotent, checkpoint, status setelah refresh, safe cancellation, deduplication, backup/migrasi aman, dan penanganan quota error yang jelas.

---

## 14. TEST DAN ACCEPTANCE CRITERIA

Implementasikan **unit tests, integration tests, dan Playwright E2E** dengan fixture legal/fiktif: PDF EN sederhana dan EPUB kecil dengan 2 bab, source text dengan angka/istilah dan beberapa paragraf, plus fixture scanned PDF minimal untuk deteksi.

**Wajib dibuktikan lewat tes atau dokumentasi test manual yang bisa dieksekusi:**

1. Halaman login meminta password saja; auth failure, rate limit, cookie, logout, expiry, CSRF terlindungi.
2. PDF text-layer dan EPUB upload; browser mem-parse tanpa mengunci UI; status, TOC, span page refs tersimpan dan bisa resume.
3. Input buku corrupt, encrypted, terlalu besar dan scan tanpa text layer menghasilkan pesan error yang benar, tanpa status selesai palsu.
4. Setelah upload, original English dapat dibuka dan source map benar.
5. Translate satu unit: output Indonesia tampil; English original tidak berubah; bilingual selaras; reload **tidak memanggil ulang model** pada cache hit.
6. Test angka, istilah teknis dan sumber halaman pada output terjemahan; output AI invalid ditolak/retry terbatas.
7. Generate chat tutor dengan citation valid; citation palsu/halaman rekaan diblokir atau dihapus, dan source link menuju span benar.
8. Probe dan Socratic learning mengikuti unit; remedial saat salah dan bisa lanjut saat mastery tercapai.
9. Kunci jawaban quiz tersembunyi sebelum submit; MCQ dinilai deterministik; open-ended memiliki rubric dan error handling.
10. Mastery probabilitas BKT diverifikasi pada unit tests termasuk edge case; FSRS/review due timezone WIB benar.
11. TTS dengan mocked browser API: voice id-ID, perubahan voices, paragraf panjang, stop, resume fallback, unavailable state, cleanup, posisi tersimpan.
12. Tanpa provider API/AI quota exhausted, reader + progress + review lama tetap berjalan; status AI offline jelas.
13. D1 Free/Vectorize unavailable: search fallback tetap berguna dan halaman tidak crash.
14. Akses anonim ke original R2, chapter, translation, progress, dan settings ditolak.
15. UI dark/light, mobile viewport 360px, tidak ada horizontal overflow, buttons touch-friendly, keyboard accessible.
16. Token usage tidak double-count pada cache hit dan idempotent retry.
17. Upload, translation dan job resume setelah refresh halaman bekerja.
18. GitHub Actions CI menjalankan install, lint, typecheck, unit, build, dan e2e yang layak; workflow production tidak mem-print secrets.
19. `npm run build` menghasilkan aset dan worker bundle kompatibel tanpa dependensi Node runtime yang tidak didukung.
20. Bila credentials tersedia dan user mengizinkan production deploy: migrasi non-destructive, deploy, smoke test login/API/SPA pada URL deployment sebenarnya. Jika tidak, beri status **NOT DEPLOYED** yang akurat.

Jangan menganggap mock-only test sebagai pembuktian AI provider sungguhan. Laporkan mana yang diuji memakai mocked provider, sandbox, atau production. Tidak perlu mengunggah dokumen pengguna ke layanan eksternal untuk test.

---

## 15. GITHUB ACTIONS, DEPLOY, DAN DOKUMENTASI

Buat:

- `.github/workflows/ci.yml` untuk lint/typecheck/test/build/security checks.
- `.github/workflows/deploy-production.yml` untuk deploy branch default + `workflow_dispatch`, menggunakan **GitHub environment production**, GitHub Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (nama bisa disesuaikan), dan Wrangler. Hindari deploy ganda, gunakan concurrency. Production saja, tanpa staging wajib.
- Hindari migrations destructive secara otomatis; sediakan langkah migrasi D1 remote yang terkontrol, backup dan rollback/restore instructions. Jangan pernah me-reset DB production.
- `wrangler` bindings untuk D1/R2, optional AI/Vectorize/Workflows dengan fitur di-guard agar deployment bisa dilakukan meskipun bindings optional belum dibuat. Siapkan scripts resource provisioning memakai CLI/API saat credential ada, tetapi **jangan mewajibkan API token tambahan untuk file R2 akses Worker binding**.
- `README.md` Bahasa Indonesia: konsep, kemampuan dan keterbatasan Cloudflare Free, cara buat D1/R2 (Vectorize opsional), cara set password tinggi-entropy, cara set AI secrets, cara develop lokal, cara GitHub Actions deploy, cara akses Android/PWA, cara ganti provider, cara backup/hapus buku.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/AI_COSTS.md`, `docs/TEST_REPORT.md`, `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md`, `docs/THIRD_PARTY_LICENSES.md`.
- `.dev.vars.example`, `.env.example` (nilai dummy aman), `.gitignore`, `wrangler` contoh; jangan pernah commit secret produksi.
- Health endpoint yang tidak membocorkan secrets, tetapi admin bisa melihat status binding dan provider.
- Jika tidak ada hak akses atau kredensial Cloudflare di Codex Cloud, tinggalkan deployment sebagai **blocked by credentials**, bukan klaim palsu; jelaskan langkah setup praktis. Jangan membuat akun/repo baru atau mengubah resource yang tidak relevan tanpa izin.

### Catatan Cloudflare Free

- CPU Worker per invocation dan request/subrequest Free harus dihormati; parsing dan TTS tetap di browser. Unit pekerjaan kecil dan resumable.
- Jangan mewajibkan Cloudflare Containers/Browser Rendering/Paid plan. Fitur khusus Paid diberi flag off atau dicatat sebagai future enhancement.
- Pastikan Static Assets tidak dipaksa melalui Worker jika tidak perlu; minimalkan request API berulang.
- Resource optional bukan blocker deploy. Pastikan jalur default dapat berjalan dengan D1 + R2 + satu provider AI yang tersedia dalam kuota.
- Harga/kuota berubah; dokumentasi harus link ke sumber resmi, bukan hardcode tarif absolut. Usage cap aplikasi adalah *safety guard*, bukan jaminan tagihan Rp0 jika menggunakan provider berbayar.

---

## 16. URUTAN IMPLEMENTASI WAJIB

Kerjakan tahap demi tahap, jalankan test setiap tahap dan perbaiki bug sebelum lanjut:

**Fase A — Audit + Foundation:** inspeksi repo, putuskan struktur, setup workspace, lint/tsconfig, Hono Worker, Vite app, route SPA, responsif, D1 migrations, R2 binding, health endpoint, CI.

**Fase B — Auth + Storage:** password-only, secure session, rate limit, R2 privat, buku create/upload/list/delete, integration tests.

**Fase C — Book Ingestion:** PDF.js/EPUB client parsing, TOC editor, source spans, chunk batch, status/checkpoint/resume, reader English, fixtures.

**Fase D — Translation:** adapter provider, model config, quota, per-unit translation EN→ID, quality checks, cache R2, reader Indonesian/bilingual, persisted glossary.

**Fase E — Retrieval + Tutor:** baseline FTS5, optional Vectorize, citations, book-scoped chat, probe, Socratic tutoring, persistence, error fallbacks.

**Fase F — Quiz + Mastery + Review:** bank kuis, adaptive learning, BKT, FSRS or properly documented reviewed alternative, progress dashboard, test edge cases.

**Fase G — Browser TTS + PWA:** implement TTS browser id-ID, voice selector, playback controls, Android fallback, read position, PWA, accessibility tests.

**Fase H — Admin + Hardening:** AI provider config, usage telemetry, budget limiter, privacy, XSS, CSS responsive, retry/idempotency, security test.

**Fase I — Production-readiness:** full test suite, clean build, CI workflow, Cloudflare resource setup guide, test with live services only if available, deploy production only with valid credentials, real smoke-test and report.

Jika terbatas waktu/konteks, tetap buat aplikasi core **yang benar-benar berjalan end-to-end** terlebih dahulu (login → upload → extract → translate → read/TTS → tutor → quiz → progress), lalu dokumentasikan enhancement tersisa secara jujur. Tidak boleh mengganti fitur penting dengan tombol kosong atau data dummy yang disamarkan sebagai produksi.

---

## 17. LAPORAN AKHIR YANG HARUS DIKEMBALIKAN CODEX

Di akhir pengerjaan, tampilkan:

1. Ringkasan fitur **IMPLEMENTED**, **PARTIAL**, dan **NOT IMPLEMENTED** berdasarkan bukti.
2. Daftar file utama dan arsitektur aktual.
3. Hasil command `lint`, `typecheck`, `test`, `build`, `e2e` yang benar-benar dieksekusi; sertakan exit code dan error bila gagal.
4. Hasil security check, input validation, data isolation, dan cache/token test.
5. Detail Cloudflare bindings dan secret **nama saja**, tanpa nilainya.
6. Status remote migration, deployment dan URL **hanya bila terverifikasi**.
7. Instruksi 1–2–3 setup cloudflare Free dan cara membuka dari Android.
8. Limitasi yang masih ada (misalnya OCR scan dan suara id-ID bergantung browser), serta biaya AI/kuota.
9. Commit hash atau PR jika benar-benar dibuat, bukan hasil rekaan.
10. Bukti smoke test reader English/Indonesian, TTS mock/manual, AI tutor, quiz, dan progres.

**Standar selesai:** aplikasi bisa dipakai untuk belajar buku berbahasa Inggris tetapi **tampil/diajarkan dalam Bahasa Indonesia**, login hanya password, TTS browser tanpa API, dan semua progress tersimpan, dengan Cloudflare Free sebagai baseline. Kerjakan semaksimal mungkin di repository aktif hingga tes lulus; **jangan berhenti pada dokumen desain**.

---

## REFERENSI RESMI (VERIFIKASI ULANG SAAT IMPLEMENTASI)

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/objects/upload-objects/
- https://developers.cloudflare.com/vectorize/platform/pricing/
- https://developers.cloudflare.com/workflows/reference/limits/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance

**Mulai sekarang: audit repository aktif, tentukan task breakdown internal, lalu langsung implementasikan file dan tes.**
