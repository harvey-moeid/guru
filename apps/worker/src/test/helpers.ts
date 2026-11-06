import app from "../index";
import type { Env } from "../env";
import { hmacSha256Hex } from "../lib/crypto";
import { createTestDb } from "./d1-shim";

export const TEST_PASSWORD = "Xk9mQ2vR7tLp4NwZ8bYc3HdF6gJs5AeU";
const PEPPER = "test-pepper-value";
const SIGNING = "test-signing-secret";
export const ORIGIN = "http://localhost";

export async function makeEnv(
  overrides: { [K in keyof Env]?: Env[K] | undefined } = {},
): Promise<Env> {
  return {
    DB: await createTestDb(),
    BUCKET: {} as R2Bucket,
    ASSETS: undefined as unknown as Fetcher,
    FEATURE_VECTORIZE_ENABLED: "false",
    FEATURE_WORKERS_AI_ENABLED: "false",
    AUTH_PEPPER: PEPPER,
    AUTH_PASSWORD_HASH: await hmacSha256Hex(PEPPER, TEST_PASSWORD),
    SESSION_SIGNING_SECRET: SIGNING,
    ...overrides,
  } as Env;
}

export function call(
  env: Env,
  path: string,
  init: RequestInit & { cookie?: string; origin?: string | null; ip?: string } = {},
) {
  const { cookie, origin = ORIGIN, ip, headers, ...rest } = init;
  const h = new Headers(headers);
  if (cookie) h.set("Cookie", cookie);
  if (origin) h.set("Origin", origin);
  if (ip) h.set("CF-Connecting-IP", ip);
  return app.request(`${ORIGIN}${path}`, { ...rest, headers: h }, env);
}

export function login(env: Env, password = TEST_PASSWORD, ip = "1.1.1.1") {
  return call(env, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    ip,
  });
}

/** Ambil pasangan name=value dari header Set-Cookie. */
export function cookieFrom(res: Response): string {
  const raw = res.headers.get("Set-Cookie") ?? "";
  return raw.split(";")[0] ?? "";
}
