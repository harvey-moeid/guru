import { hmacSha256Hex } from "./crypto";
import type { Env } from "../env";

/** Batas percobaan login gagal (B4). Persisten di D1 tabel auth_attempts. */
export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILS_PER_IP = 5;
export const MAX_FAILS_GLOBAL = 30;
const RETENTION_MS = 24 * 60 * 60 * 1000;

/** IP selalu di-hash (HMAC) sebelum disimpan; IP mentah tidak pernah masuk DB/log. */
export async function hashIp(env: Env, ip: string): Promise<string> {
  return hmacSha256Hex(env.SESSION_SIGNING_SECRET ?? "", `ip:${ip}`);
}

export interface LockoutState {
  locked: boolean;
  retryAfterSeconds: number;
}

async function oldestFailure(
  env: Env,
  since: string,
  ipHash?: string,
): Promise<{ count: number; oldest: string | null }> {
  const sql = ipHash
    ? "SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM auth_attempts WHERE success = 0 AND created_at >= ? AND ip_hash = ?"
    : "SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM auth_attempts WHERE success = 0 AND created_at >= ?";
  const stmt = env.DB.prepare(sql);
  const row = await (ipHash ? stmt.bind(since, ipHash) : stmt.bind(since)).first<{
    n: number;
    oldest: string | null;
  }>();
  return { count: row?.n ?? 0, oldest: row?.oldest ?? null };
}

export async function checkLockout(env: Env, ipHash: string): Promise<LockoutState> {
  const now = Date.now();
  const since = new Date(now - WINDOW_MS).toISOString();
  const [perIp, global] = await Promise.all([
    oldestFailure(env, since, ipHash),
    oldestFailure(env, since),
  ]);
  const scopes = [
    { hit: perIp.count >= MAX_FAILS_PER_IP, oldest: perIp.oldest },
    { hit: global.count >= MAX_FAILS_GLOBAL, oldest: global.oldest },
  ].filter((s) => s.hit);
  if (scopes.length === 0) return { locked: false, retryAfterSeconds: 0 };
  const wait = Math.max(
    ...scopes.map((s) => (s.oldest ? Date.parse(s.oldest) + WINDOW_MS - now : WINDOW_MS)),
  );
  return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)) };
}

export async function recordAttempt(env: Env, ipHash: string, success: boolean): Promise<void> {
  const now = new Date();
  await env.DB.prepare("INSERT INTO auth_attempts (ip_hash, success, created_at) VALUES (?, ?, ?)")
    .bind(ipHash, success ? 1 : 0, now.toISOString())
    .run();
  if (success) {
    // Login sukses mereset hitungan gagal untuk IP ini.
    await env.DB.prepare("DELETE FROM auth_attempts WHERE ip_hash = ? AND success = 0")
      .bind(ipHash)
      .run();
  }
  await env.DB.prepare("DELETE FROM auth_attempts WHERE created_at < ?")
    .bind(new Date(now.getTime() - RETENTION_MS).toISOString())
    .run();
}
