import { Hono } from "hono";
import { healthResponseSchema } from "@guru/shared";
import type { AppEnv } from "./env";
import { errorResponse } from "./lib/http";
import { requireSession } from "./middleware/auth";
import { csrfProtection, requestContext } from "./middleware/security";
import { authRoutes } from "./routes/auth";

const app = new Hono<AppEnv>();

// Urutan penting: request id + header keamanan → CSRF → auth (B5, B6).
app.use("*", requestContext);
app.use("/api/*", csrfProtection);
app.use("/api/*", requireSession);

/**
 * Health check publik. Tidak memerlukan auth, tidak boleh bocorkan
 * informasi binding/secret apa pun (SPEK §2, A3).
 */
app.get("/api/health", (c) => {
  const body = healthResponseSchema.parse({
    status: "ok",
    time: new Date().toISOString(),
  });
  return c.json(body);
});

app.route("/api/auth", authRoutes);

// Rute buku, terjemahan, tutor, dst. ditambahkan di fase berikutnya.

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/")) {
    return errorResponse(c, 404, "NOT_FOUND", "Endpoint tidak ditemukan.");
  }
  // Selain /api/*: serahkan ke Static Assets (SPA).
  return c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text("Not found", 404);
});

app.onError((err, c) => {
  // Jangan bocorkan detail error ke klien; log hanya nama error tanpa data sensitif.
  console.error(`[${c.get("requestId")}] unhandled error: ${err.name}`);
  return errorResponse(c, 500, "INTERNAL_ERROR", "Terjadi kesalahan di server.");
});

export default app;
