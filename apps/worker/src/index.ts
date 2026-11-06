import { Hono } from "hono";
import { healthResponseSchema } from "@guru/shared";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

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

// Rute lain (/api/auth/*, /api/books/*, dst.) ditambahkan di FASE B dan seterusnya.
// Middleware auth global untuk /api/* selain login/health akan dipasang di B6.

export default app;
