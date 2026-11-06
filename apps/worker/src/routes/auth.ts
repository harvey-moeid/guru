import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME, loginRequestSchema } from "@guru/shared";
import type { AppEnv } from "../env";
import { hmacSha256Hex, timingSafeEqualStr } from "../lib/crypto";
import { errorResponse } from "../lib/http";
import { checkLockout, hashIp, recordAttempt } from "../lib/ratelimit";
import { createSession, purgeOldSessions, revokeSessionByToken } from "../lib/session";
import { cookieOptions } from "../middleware/auth";

const MAX_LOGIN_BODY_BYTES = 2048;

export const authRoutes = new Hono<AppEnv>();

/** POST /api/auth/login — password-only (B2). Pesan error sengaja generik. */
authRoutes.post("/login", async (c) => {
  const { AUTH_PEPPER, AUTH_PASSWORD_HASH, SESSION_SIGNING_SECRET } = c.env;
  if (!AUTH_PEPPER || !AUTH_PASSWORD_HASH || !SESSION_SIGNING_SECRET) {
    return errorResponse(c, 503, "INTERNAL_ERROR", "Login belum dikonfigurasi di server.");
  }

  const declared = Number(c.req.header("Content-Length") ?? 0);
  if (declared > MAX_LOGIN_BODY_BYTES) {
    return errorResponse(c, 413, "VALIDATION_FAILED", "Permintaan terlalu besar.");
  }
  let raw: unknown;
  try {
    const text = await c.req.text();
    if (text.length > MAX_LOGIN_BODY_BYTES) throw new Error("too large");
    raw = JSON.parse(text);
  } catch {
    return errorResponse(c, 400, "VALIDATION_FAILED", "Body harus JSON valid.");
  }
  const parsed = loginRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_FAILED", "Password wajib diisi.");
  }

  const ipHash = await hashIp(c.env, c.req.header("CF-Connecting-IP") ?? "unknown");
  const lockout = await checkLockout(c.env, ipHash);
  if (lockout.locked) {
    return errorResponse(c, 429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", {
      "Retry-After": String(lockout.retryAfterSeconds),
    });
  }

  const candidate = await hmacSha256Hex(AUTH_PEPPER, parsed.data.password);
  const ok = timingSafeEqualStr(candidate, AUTH_PASSWORD_HASH.trim().toLowerCase());
  await recordAttempt(c.env, ipHash, ok);
  if (!ok) {
    return errorResponse(c, 401, "UNAUTHENTICATED", "Password salah.");
  }

  const session = await createSession(c.env);
  await purgeOldSessions(c.env);
  setCookie(c, SESSION_COOKIE_NAME, session.token, cookieOptions);
  return c.json({ ok: true, expiresAt: session.expiresAt });
});

/** POST /api/auth/logout — idempotent; benar-benar mencabut sesi di D1 (B3). */
authRoutes.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (token && c.env.SESSION_SIGNING_SECRET) {
    await revokeSessionByToken(c.env, token);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

/** GET /api/auth/session — dilindungi middleware; 401 bila belum login. */
authRoutes.get("/session", (c) =>
  c.json({ authenticated: true, expiresAt: c.get("sessionExpiresAt") ?? null }),
);
