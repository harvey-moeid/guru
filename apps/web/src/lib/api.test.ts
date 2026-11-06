import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchSession, loginRequest } from "./api";

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("fetchSession: 401 → null (belum login)", async () => {
    mockFetch(401, { error: { code: "UNAUTHENTICATED", message: "x", requestId: "r" } });
    expect(await fetchSession()).toBeNull();
  });

  it("fetchSession: 200 → info sesi", async () => {
    mockFetch(200, { authenticated: true, expiresAt: "2026-01-01T00:00:00.000Z" });
    expect(await fetchSession()).toEqual({
      authenticated: true,
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("fetchSession: error server (500) dilempar, bukan dianggap logout", async () => {
    mockFetch(500, { error: { code: "INTERNAL_ERROR", message: "boom", requestId: "r" } });
    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError);
  });

  it("loginRequest: meneruskan pesan error server (mis. RATE_LIMITED)", async () => {
    mockFetch(429, { error: { code: "RATE_LIMITED", message: "Terlalu banyak.", requestId: "r" } });
    await expect(loginRequest("x")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      message: "Terlalu banyak.",
    });
  });
});
