import { describe, expect, it } from "vitest";
import app from "./index";

describe("GET /api/health", () => {
  it("mengembalikan status ok tanpa membocorkan binding", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ status: "ok" });
    expect(typeof body.time).toBe("string");

    // Pastikan tidak ada field yang bocor (mis. secret/env).
    expect(Object.keys(body).sort()).toEqual(["status", "time"]);
  });
});
