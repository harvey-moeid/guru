/**
 * Tipe binding Cloudflare Worker. Cocokkan dengan wrangler.jsonc.
 * Secret (AUTH_PEPPER, dst.) diisi lewat `wrangler secret put`, bukan di sini.
 */
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;

  // Feature flags
  FEATURE_VECTORIZE_ENABLED: string;
  FEATURE_WORKERS_AI_ENABLED: string;

  // Secrets (opsional saat dev lokal; lihat .dev.vars.example)
  AUTH_PEPPER?: string;
  AUTH_PASSWORD_HASH?: string;
  SESSION_SIGNING_SECRET?: string;
  AI_PROVIDER_API_KEY?: string;
  AI_PROVIDER_BASE_URL?: string;
  AI_PROVIDER_MODEL?: string;
  GEMINI_API_KEY?: string;
}

/** Tipe Hono bersama: binding + variabel per-request. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
    sessionId?: string;
    sessionExpiresAt?: string;
  };
};
