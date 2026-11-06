import { z } from "zod";
import { BOOK_PROCESSING_STATUS, READER_MODES, SUPPORTED_BOOK_EXTENSIONS } from "./constants";

/** Respons GET /api/health. Tidak boleh membocorkan secret/env. */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Skema dasar metadata buku (akan diperluas di FASE C). */
export const bookExtensionSchema = z.enum(SUPPORTED_BOOK_EXTENSIONS);

export const bookStatusSchema = z.enum(BOOK_PROCESSING_STATUS);

export const bookSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  extension: bookExtensionSchema,
  status: bookStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BookSummary = z.infer<typeof bookSummarySchema>;

export const readerModeSchema = z.enum(READER_MODES);

/** Body POST /api/auth/login (B2). Batas panjang mencegah body abusif. */
export const loginRequestSchema = z.object({
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Body POST /api/books (B7): metadata sebelum unggah. SHA-256 dihitung di browser (C3). */
export const createBookRequestSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author: z.string().trim().max(300).optional(),
  extension: bookExtensionSchema,
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "SHA-256 harus 64 karakter hex huruf kecil"),
  sizeBytes: z.number().int().positive(),
});
export type CreateBookRequest = z.infer<typeof createBookRequestSchema>;
