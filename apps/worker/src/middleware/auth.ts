import type { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME } from "@guru/shared";
import type { AppEnv } from "../env";
import { errorResponse } from "../lib/http";
import {
  SESSION_ROTATE_AFTER_SECONDS,
  SESSION_TTL_SECONDS,
  createSession,
  revokeSessionById,
  validateSession,
} from "../lib/session";

/** Rute /api/* yang boleh diakses tanpa login (B6). Selain ini wajib sesi valid. */
const PUBLIC_API_PATHS = new Set(["/api/health", "/api/auth/login", "/api/auth/logout"]);

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/** Middleware auth global untuk /api/* (B6) + rotasi token sesi (B3). */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC_API_PATHS.has(path)) return next();

  const unauthenticated = () => {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    return errorResponse(c, 401, "UNAUTHENTICATED", "Silakan login terlebih dahulu.");
  };

  if (!c.env.SESSION_SIGNING_SECRET) return unauthenticated();
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return unauthenticated();
  const session = await validateSession(c.env, token);
  if (!session) return unauthenticated();

  let { id, expiresAt } = session;
  const ageSeconds = (Date.now() - Date.parse(session.createdAt)) / 1000;
  if (ageSeconds > SESSION_ROTATE_AFTER_SECONDS) {
    const fresh = await createSession(c.env);
    await revokeSessionById(c.env, session.id);
    setCookie(c, SESSION_COOKIE_NAME, fresh.token, cookieOptions);
    id = fresh.id;
    expiresAt = fresh.expiresAt;
  }
  c.set("sessionId", id);
  c.set("sessionExpiresAt", expiresAt);
  return next();
};
