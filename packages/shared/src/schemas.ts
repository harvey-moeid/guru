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
