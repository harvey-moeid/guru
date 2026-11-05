/**
 * Kode error API (PLAN.md §4). Bentuk respons error wajib:
 * { error: { code, message, requestId } }
 */
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "INVALID_FILE",
  "PROCESSING",
  "AI_NOT_CONFIGURED",
  "AI_QUOTA_REACHED",
  "TRANSLATION_NOT_READY",
  "RETRYABLE",
  "RATE_LIMITED",
  "CSRF_FAILED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
  };
}

/** Helper untuk membentuk body error API secara konsisten. */
export function apiError(code: ErrorCode, message: string, requestId: string): ApiErrorBody {
  return { error: { code, message, requestId } };
}
