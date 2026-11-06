import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { errorResponse } from "../lib/http";

/**
 * CSP kompatibel PDF.js (worker lokal dari 'self'/blob:) dan Tailwind (style inline kecil).
 * Static assets memakai aturan sama lewat apps/web/public/_headers — jaga keduanya sinkron.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Request ID + security headers (B5) untuk semua respons; no-store untuk /api/*. */
export const requestContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
  c.header("X-Request-Id", c.get("requestId"));
  c.header("Content-Security-Policy", CSP);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-origin");
  if (new URL(c.req.url).pathname.startsWith("/api/")) {
    c.header("Cache-Control", "no-store");
  }
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Perlindungan CSRF (B5): semua mutasi /api/* wajib punya Origin (atau Referer)
 * yang sama dengan origin request. CORS sengaja tidak diaktifkan (same-origin saja).
 */
export const csrfProtection: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();
  const selfOrigin = new URL(c.req.url).origin;
  let candidate: string | null = c.req.header("Origin") ?? null;
  if (!candidate) {
    const referer = c.req.header("Referer");
    if (referer) {
      try {
        candidate = new URL(referer).origin;
      } catch {
        candidate = null;
      }
    }
  }
  if (candidate !== selfOrigin || c.req.header("Sec-Fetch-Site") === "cross-site") {
    return errorResponse(c, 403, "CSRF_FAILED", "Permintaan ditolak (asal tidak valid).");
  }
  return next();
};
