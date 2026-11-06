import { describe, expect, it } from "vitest";
import { hmacSha256Hex, timingSafeEqualStr } from "./lib/crypto";
import { MAX_FAILS_PER_IP } from "./lib/ratelimit";
import { rawExec } from "./test/d1-shim";
import { TEST_PASSWORD, call, cookieFrom, login, makeEnv } from "./test/helpers";

describe("crypto", () => {
  it("HMAC-SHA-256 sesuai vektor uji standar", async () => {
    expect(await hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });
  it("timingSafeEqualStr benar untuk sama/beda/panjang beda", () => {
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
    expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
    expect(timingSafeEqualStr("", "")).toBe(true);
  });
});

describe("login (B2/B3)", () => {
  it("password salah → 401 tanpa cookie", async () => {
    const env = await makeEnv();
    const res = await login(env, "salah-total");
    expect(res.status).toBe(401);
    expect(res.headers.get("Set-Cookie")).toBeNull();
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.requestId).toBeTruthy();
  });

  it("password benar → cookie HttpOnly/Secure/SameSite=Strict; token mentah tidak disimpan", async () => {
    const env = await makeEnv();
    const res = await login(env);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toMatch(/guru_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const token = cookieFrom(res).split("=")[1] ?? "";
    const rows = await env.DB.prepare("SELECT token_hash FROM sessions").all<{
      token_hash: string;
    }>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0]?.token_hash).not.toBe(token);
    expect(rows.results[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("server belum dikonfigurasi → 503, bukan login lolos", async () => {
    const env = await makeEnv({ AUTH_PASSWORD_HASH: undefined });
    expect((await login(env)).status).toBe(503);
  });

  it("body invalid → 400", async () => {
    const env = await makeEnv();
    const res = await call(env, "/api/auth/login", { method: "POST", body: "bukan json" });
    expect(res.status).toBe(400);
    const res2 = await call(env, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: "" }),
    });
    expect(res2.status).toBe(400);
  });
});

describe("session, logout, replay, expiry, tampering (B3/B6/B9)", () => {
  it("session valid → 200; logout mencabut; token lama tidak bisa dipakai ulang (replay)", async () => {
    const env = await makeEnv();
    const cookie = cookieFrom(await login(env));
    expect((await call(env, "/api/auth/session", { cookie })).status).toBe(200);

    const out = await call(env, "/api/auth/logout", { method: "POST", cookie });
    expect(out.status).toBe(200);
    expect(out.headers.get("Set-Cookie") ?? "").toMatch(/guru_session=;|Max-Age=0/i);

    expect((await call(env, "/api/auth/session", { cookie })).status).toBe(401);
  });

  it("cookie dimanipulasi → 401", async () => {
    const env = await makeEnv();
    const cookie = cookieFrom(await login(env));
    const tampered = `${cookie.slice(0, -2)}xx`;
    expect((await call(env, "/api/auth/session", { cookie: tampered })).status).toBe(401);
    expect((await call(env, "/api/auth/session", { cookie: "guru_session=ngawur" })).status).toBe(
      401,
    );
  });

  it("sesi kedaluwarsa → 401", async () => {
    const env = await makeEnv();
    const cookie = cookieFrom(await login(env));
    rawExec(env.DB, "UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'");
    expect((await call(env, "/api/auth/session", { cookie })).status).toBe(401);
  });

  it("token dirotasi setelah >24 jam; token lama dicabut", async () => {
    const env = await makeEnv();
    const oldCookie = cookieFrom(await login(env));
    rawExec(env.DB, "UPDATE sessions SET created_at = '2000-01-01T00:00:00.000Z'");
    const res = await call(env, "/api/auth/session", { cookie: oldCookie });
    expect(res.status).toBe(200);
    const newCookie = cookieFrom(res);
    expect(newCookie).toMatch(/^guru_session=/);
    expect(newCookie).not.toBe(oldCookie);
    expect((await call(env, "/api/auth/session", { cookie: oldCookie })).status).toBe(401);
    expect((await call(env, "/api/auth/session", { cookie: newCookie })).status).toBe(200);
  });

  it("akses anonim ke /api/* selain health/login/logout ditolak, termasuk rute tak dikenal", async () => {
    const env = await makeEnv();
    for (const path of ["/api/books", "/api/settings", "/api/auth/session", "/api/apa-saja"]) {
      const res = await call(env, path);
      expect(res.status, path).toBe(401);
    }
    expect((await call(env, "/api/health")).status).toBe(200);
  });

  it("rute tak dikenal setelah login → 404 JSON", async () => {
    const env = await makeEnv();
    const cookie = cookieFrom(await login(env));
    const res = await call(env, "/api/tidak-ada", { cookie });
    expect(res.status).toBe(404);
  });
});

describe("rate limit & lockout (B4)", () => {
  it("terkunci setelah batas gagal, bahkan dengan password benar; ada Retry-After", async () => {
    const env = await makeEnv();
    for (let i = 0; i < MAX_FAILS_PER_IP; i++) {
      expect((await login(env, `salah-${i}`)).status).toBe(401);
    }
    const locked = await login(env, TEST_PASSWORD);
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("Retry-After"))).toBeGreaterThan(0);
    // IP lain tidak terkunci.
    expect((await login(env, TEST_PASSWORD, "2.2.2.2")).status).toBe(200);
  });

  it("IP disimpan sebagai hash, password tidak pernah tercatat", async () => {
    const env = await makeEnv();
    await login(env, "rahasia-banget-123", "9.9.9.9");
    const rows = await env.DB.prepare("SELECT * FROM auth_attempts").all<Record<string, unknown>>();
    const dump = JSON.stringify(rows.results);
    expect(dump).not.toContain("9.9.9.9");
    expect(dump).not.toContain("rahasia-banget-123");
  });

  it("login sukses mereset hitungan gagal IP tersebut", async () => {
    const env = await makeEnv();
    for (let i = 0; i < MAX_FAILS_PER_IP - 1; i++) await login(env, `salah-${i}`);
    expect((await login(env)).status).toBe(200);
    for (let i = 0; i < MAX_FAILS_PER_IP - 1; i++) await login(env, `salah-${i}`);
    expect((await login(env)).status).toBe(200);
  });
});

describe("CSRF & security headers (B5)", () => {
  it("mutasi dengan Origin asing atau tanpa Origin → 403 CSRF_FAILED", async () => {
    const env = await makeEnv();
    const foreign = await call(env, "/api/auth/login", {
      method: "POST",
      origin: "https://evil.example",
      body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    expect(foreign.status).toBe(403);
    expect(((await foreign.json()) as { error: { code: string } }).error.code).toBe("CSRF_FAILED");

    const none = await call(env, "/api/auth/login", {
      method: "POST",
      origin: null,
      body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    expect(none.status).toBe(403);
  });

  it("logout lintas-origin ditolak dan sesi tetap hidup", async () => {
    const env = await makeEnv();
    const cookie = cookieFrom(await login(env));
    const res = await call(env, "/api/auth/logout", {
      method: "POST",
      cookie,
      origin: "https://evil.example",
    });
    expect(res.status).toBe(403);
    expect((await call(env, "/api/auth/session", { cookie })).status).toBe(200);
  });

  it("header keamanan ada di health; tidak ada CORS", async () => {
    const env = await makeEnv();
    const res = await call(env, "/api/health");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("Strict-Transport-Security")).toMatch(/max-age=/);
    expect(res.headers.get("Content-Security-Policy")).toMatch(/frame-ancestors 'none'/);
    expect(res.headers.get("Content-Security-Policy")).toMatch(/worker-src 'self' blob:/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
