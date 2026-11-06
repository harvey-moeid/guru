import { hmacSha256Hex, randomToken } from "./crypto";
import type { Env } from "../env";

/** Masa berlaku sesi dan batas usia sebelum token dirotasi. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_ROTATE_AFTER_SECONDS = 24 * 60 * 60;

export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
}

/** Hash token sesi (HMAC dengan signing secret). Token mentah tidak pernah disimpan. */
async function tokenHash(env: Env, token: string): Promise<string> {
  return hmacSha256Hex(env.SESSION_SIGNING_SECRET ?? "", `session:${token}`);
}

export async function createSession(env: Env): Promise<{ token: string } & SessionInfo> {
  const token = randomToken(32);
  const id = crypto.randomUUID();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, await tokenHash(env, token), createdAt, expiresAt)
    .run();
  return { token, id, createdAt, expiresAt };
}

/** Kembalikan info sesi bila token valid, belum dicabut, dan belum kedaluwarsa. */
export async function validateSession(env: Env, token: string): Promise<SessionInfo | null> {
  if (!token || token.length > 128) return null;
  const row = await env.DB.prepare(
    "SELECT id, created_at, expires_at FROM sessions WHERE token_hash = ? AND revoked_at IS NULL",
  )
    .bind(await tokenHash(env, token))
    .first<{ id: string; created_at: string; expires_at: string }>();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return { id: row.id, createdAt: row.created_at, expiresAt: row.expires_at };
}

export async function revokeSessionByToken(env: Env, token: string): Promise<void> {
  if (!token || token.length > 128) return;
  await env.DB.prepare(
    "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
  )
    .bind(new Date().toISOString(), await tokenHash(env, token))
    .run();
}

export async function revokeSessionById(env: Env, id: string): Promise<void> {
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .bind(new Date().toISOString(), id)
    .run();
}

/** Hapus sesi kedaluwarsa/dicabut yang sudah lama (dipanggil oportunistik saat login). */
export async function purgeOldSessions(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ? OR revoked_at < ?")
    .bind(cutoff, cutoff)
    .run();
}
