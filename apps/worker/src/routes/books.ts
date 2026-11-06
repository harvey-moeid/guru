import { Hono } from "hono";
import { DEFAULT_MAX_UPLOAD_BYTES, createBookRequestSchema } from "@guru/shared";
import type { AppEnv } from "../env";
import { errorResponse } from "../lib/http";

export const bookRoutes = new Hono<AppEnv>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_JSON_BYTES = 8 * 1024;
/** Semua objek R2 milik satu buku; dipakai saat hapus agar tidak ada sisa (B7). */
const r2Prefixes = (id: string) => [`originals/${id}/`, `extracted/${id}/`, `translations/${id}/`];

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  extension: string;
  source_sha256: string;
  r2_key_original: string;
  status: string;
  failure_reason: string | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

/** DTO publik: tidak membocorkan kunci R2 internal. */
function toDto(r: BookRow) {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    extension: r.extension,
    status: r.status,
    failureReason: r.failure_reason,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function findBook(c: { env: AppEnv["Bindings"] }, id: string): Promise<BookRow | null> {
  if (!UUID_RE.test(id)) return null;
  return c.env.DB.prepare("SELECT * FROM books WHERE id = ?").bind(id).first<BookRow>();
}

async function setStatus(env: AppEnv["Bindings"], id: string, status: string, reason?: string) {
  await env.DB.prepare(
    "UPDATE books SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?",
  )
    .bind(status, reason ?? null, new Date().toISOString(), id)
    .run();
}

bookRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM books ORDER BY created_at DESC LIMIT 200",
  ).all<BookRow>();
  return c.json({ books: rows.results.map(toDto) });
});

bookRoutes.get("/:id", async (c) => {
  const book = await findBook(c, c.req.param("id"));
  if (!book) return errorResponse(c, 404, "NOT_FOUND", "Buku tidak ditemukan.");
  return c.json({ book: toDto(book) });
});

bookRoutes.post("/", async (c) => {
  let raw: unknown;
  try {
    const text = await c.req.text();
    if (text.length > MAX_JSON_BYTES) throw new Error("too large");
    raw = JSON.parse(text);
  } catch {
    return errorResponse(c, 400, "VALIDATION_FAILED", "Body harus JSON valid.");
  }
  const parsed = createBookRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_FAILED", "Data buku tidak valid.");
  }
  const { title, author, extension, sha256, sizeBytes } = parsed.data;
  if (sizeBytes > DEFAULT_MAX_UPLOAD_BYTES) {
    return errorResponse(
      c,
      413,
      "INVALID_FILE",
      `File terlalu besar (maksimal ${DEFAULT_MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
    );
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Kunci R2 berbasis UUID: nama file pengguna tidak pernah dipakai sebagai path.
  const key = `originals/${id}/source.${extension}`;
  await c.env.DB.prepare(
    `INSERT INTO books (id, title, author, extension, source_sha256, r2_key_original, status, size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
  )
    .bind(id, title, author ?? null, extension, sha256, key, sizeBytes, now, now)
    .run();
  const book = await findBook(c, id);
  return c.json({ book: book ? toDto(book) : null }, 201);
});

/**
 * Unggah berkas asli: body di-stream langsung ke R2 (tidak di-buffer di Worker).
 * Integritas: R2 memverifikasi SHA-256 yang dideklarasikan; ukuran dan signature
 * (magic bytes) diperiksa setelah tersimpan. Gagal → objek dibuang, status `failed`.
 */
bookRoutes.post("/:id/upload", async (c) => {
  const book = await findBook(c, c.req.param("id"));
  if (!book) return errorResponse(c, 404, "NOT_FOUND", "Buku tidak ditemukan.");
  if (book.status !== "created" && book.status !== "uploading") {
    return errorResponse(c, 409, "PROCESSING", "Buku ini sudah diunggah atau sedang diproses.");
  }
  const length = Number(c.req.header("Content-Length"));
  if (!Number.isInteger(length) || length !== book.size_bytes || !c.req.raw.body) {
    return errorResponse(
      c,
      400,
      "INVALID_FILE",
      "Content-Length wajib ada dan harus sama dengan ukuran yang dideklarasikan.",
    );
  }

  await setStatus(c.env, book.id, "uploading");
  const fail = async (message: string) => {
    await c.env.BUCKET.delete(book.r2_key_original);
    await setStatus(c.env, book.id, "failed", message);
    return errorResponse(c, 400, "INVALID_FILE", message);
  };

  try {
    await c.env.BUCKET.put(book.r2_key_original, c.req.raw.body, {
      sha256: book.source_sha256,
      httpMetadata: { contentType: "application/octet-stream" },
    });
  } catch {
    // Paling umum: checksum tidak cocok (file rusak/terpotong saat transfer).
    return fail("Unggahan gagal diverifikasi (checksum tidak cocok atau terputus). Coba lagi.");
  }

  const head = await c.env.BUCKET.head(book.r2_key_original);
  if (!head || head.size !== book.size_bytes) {
    return fail("Ukuran file tersimpan tidak sesuai. Coba unggah ulang.");
  }
  const sniff = await c.env.BUCKET.get(book.r2_key_original, { range: { offset: 0, length: 5 } });
  const bytes = sniff ? new Uint8Array(await sniff.arrayBuffer()) : new Uint8Array();
  const isPdf = String.fromCharCode(...bytes) === "%PDF-";
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if ((book.extension === "pdf" && !isPdf) || (book.extension === "epub" && !isZip)) {
    return fail("Isi file tidak sesuai dengan ekstensinya.");
  }

  await setStatus(c.env, book.id, "extracting");
  const updated = await findBook(c, book.id);
  return c.json({ book: updated ? toDto(updated) : null });
});

/** Hapus buku: R2 dulu (semua prefix), baru D1 (FK ON DELETE CASCADE membersihkan turunan). */
bookRoutes.delete("/:id", async (c) => {
  const book = await findBook(c, c.req.param("id"));
  if (!book) return errorResponse(c, 404, "NOT_FOUND", "Buku tidak ditemukan.");
  try {
    for (const prefix of r2Prefixes(book.id)) {
      let cursor: string | undefined;
      do {
        const page = await c.env.BUCKET.list({ prefix, ...(cursor ? { cursor } : {}) });
        if (page.objects.length > 0) {
          await c.env.BUCKET.delete(page.objects.map((o) => o.key));
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
    }
  } catch {
    // D1 sengaja tidak disentuh agar penghapusan bisa diulang sampai bersih.
    return errorResponse(c, 503, "RETRYABLE", "Gagal menghapus file buku. Coba lagi.");
  }
  await c.env.DB.prepare("DELETE FROM books WHERE id = ?").bind(book.id).run();
  return c.json({ ok: true });
});
