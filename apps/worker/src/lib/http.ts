import type { Context } from "hono";
import { apiError, type ErrorCode } from "@guru/shared";
import type { AppEnv } from "../env";

/** Respons error seragam: { error: { code, message, requestId } } (PLAN.md §4). */
export function errorResponse(
  c: Context<AppEnv>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 503,
  code: ErrorCode,
  message: string,
  headers?: Record<string, string>,
): Response {
  return c.json(apiError(code, message, c.get("requestId") ?? "unknown"), status, headers);
}
