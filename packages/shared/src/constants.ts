/**
 * Konstanta bersama untuk seluruh paket (worker + web).
 * Nilai di sini adalah default yang aman untuk Cloudflare Workers Free;
 * jangan diasumsikan final tanpa verifikasi dokumentasi resmi saat implementasi
 * fitur yang terdampak (lihat PLAN.md §3).
 */

/** Locale & timezone tetap: aplikasi ini single-user, Bahasa Indonesia. */
export const LOCALE = "id-ID" as const;
export const TIMEZONE = "Asia/Jakarta" as const;

/** Batas ukuran unggah buku, dalam bytes. Bisa dikonfigurasi lewat /settings. */
export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** Ekstensi buku yang didukung. */
export const SUPPORTED_BOOK_EXTENSIONS = ["pdf", "epub"] as const;

/** Nama cookie sesi. */
export const SESSION_COOKIE_NAME = "guru_session";

/** Status pemrosesan buku (SPEK §4). */
export const BOOK_PROCESSING_STATUS = [
  "created",
  "uploading",
  "extracting",
  "outline_review",
  "ready",
  "failed",
  "cancelled",
] as const;

/** Status job terjemahan. */
export const TRANSLATION_JOB_STATUS = ["pending", "in_progress", "done", "failed"] as const;

/** Mode tampilan reader. */
export const READER_MODES = ["id", "en", "bilingual"] as const;

/** Grade kartu FSRS (SPEK §8). */
export const REVIEW_GRADES = ["again", "hard", "good", "easy"] as const;
