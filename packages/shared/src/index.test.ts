import { describe, expect, it } from "vitest";
import { apiError, healthResponseSchema, LOCALE, TIMEZONE } from "./index";

describe("constants", () => {
  it("locale dan timezone sesuai target single-user Indonesia", () => {
    expect(LOCALE).toBe("id-ID");
    expect(TIMEZONE).toBe("Asia/Jakarta");
  });
});

describe("apiError", () => {
  it("membentuk body error sesuai konvensi { error: { code, message, requestId } }", () => {
    const body = apiError("UNAUTHENTICATED", "Belum login", "req-123");
    expect(body).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Belum login", requestId: "req-123" },
    });
  });
});

describe("healthResponseSchema", () => {
  it("menolak status selain 'ok'", () => {
    expect(() => healthResponseSchema.parse({ status: "down", time: "x" })).toThrow();
  });

  it("menerima bentuk yang valid", () => {
    const parsed = healthResponseSchema.parse({ status: "ok", time: "2026-11-05T00:00:00Z" });
    expect(parsed.status).toBe("ok");
  });
});
