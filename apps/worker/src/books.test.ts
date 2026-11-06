import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_UPLOAD_BYTES } from "@guru/shared";
import type { Env } from "./env";
import type { TestBucket } from "./test/r2-shim";
import { sha256Hex } from "./test/sha";
import { call, cookieFrom, login, makeEnv } from "./test/helpers";

const enc = new TextEncoder();
const PDF = enc.encode("%PDF-1.4\nisi buku fiktif untuk tes\n");

async function setup() {
  const env = await makeEnv();
  const cookie = cookieFrom(await login(env));
  return { env, cookie, bucket: env.BUCKET as unknown as TestBucket };
}

async function createBook(env: Env, cookie: string, bytes = PDF, extension = "pdf") {
  const res = await call(env, "/api/books", {
    method: "POST",
    cookie,
    body: JSON.stringify({
      title: "Buku Uji",
      extension,
      sha256: await sha256Hex(bytes),
      sizeBytes: bytes.length,
    }),
  });
  const body = (await res.json()) as { book?: { id: string; status: string } };
  return { res, id: body.book?.id ?? "" };
}

function upload(env: Env, cookie: string, id: string, bytes: Uint8Array, length = bytes.length) {
  return call(env, `/api/books/${id}/upload`, {
    method: "POST",
    cookie,
    headers: { "Content-Length": String(length) },
    body: bytes,
  });
}

describe("akses anonim ke buku/R2 (B6/B9)", () => {
  it("semua endpoint buku menolak tanpa login", async () => {
    const env = await makeEnv();
    const id = "11111111-1111-4111-8111-111111111111";
    expect((await call(env, "/api/books")).status).toBe(401);
    expect((await call(env, `/api/books/${id}`)).status).toBe(401);
    expect((await call(env, "/api/books", { method: "POST", body: "{}" })).status).toBe(401);
    expect((await call(env, `/api/books/${id}/upload`, { method: "POST" })).status).toBe(401);
    expect((await call(env, `/api/books/${id}`, { method: "DELETE" })).status).toBe(401);
  });
});

describe("POST/GET /api/books", () => {
  it("membuat buku, muncul di daftar dan detail; DTO tidak membocorkan kunci R2", async () => {
    const { env, cookie } = await setup();
    const { res, id } = await createBook(env, cookie);
    expect(res.status).toBe(201);
    const list = (await (await call(env, "/api/books", { cookie })).json()) as {
      books: Array<Record<string, unknown>>;
    };
    expect(list.books).toHaveLength(1);
    expect(list.books[0]).toMatchObject({ id, title: "Buku Uji", status: "created" });
    expect(JSON.stringify(list)).not.toContain("originals/");
    expect((await call(env, `/api/books/${id}`, { cookie })).status).toBe(200);
  });

  it("validasi: ekstensi/sha256/ukuran tidak valid → 400; terlalu besar → 413", async () => {
    const { env, cookie } = await setup();
    const post = (payload: unknown) =>
      call(env, "/api/books", { method: "POST", cookie, body: JSON.stringify(payload) });
    const ok = { title: "T", extension: "pdf", sha256: "a".repeat(64), sizeBytes: 10 };
    expect((await post({ ...ok, extension: "exe" })).status).toBe(400);
    expect((await post({ ...ok, sha256: "xyz" })).status).toBe(400);
    expect((await post({ ...ok, title: "   " })).status).toBe(400);
    expect((await post({ ...ok, sizeBytes: 0 })).status).toBe(400);
    expect((await post({ ...ok, sizeBytes: DEFAULT_MAX_UPLOAD_BYTES + 1 })).status).toBe(413);
  });

  it("id bukan UUID / tidak ada → 404", async () => {
    const { env, cookie } = await setup();
    expect((await call(env, "/api/books/../../etc", { cookie })).status).toBe(404);
    expect((await call(env, "/api/books/bukan-uuid", { cookie })).status).toBe(404);
  });
});

describe("POST /api/books/:id/upload", () => {
  it("sukses: tersimpan di R2 (kunci UUID), status → extracting", async () => {
    const { env, cookie, bucket } = await setup();
    const { id } = await createBook(env, cookie);
    const res = await upload(env, cookie, id, PDF);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { book: { status: string } }).book.status).toBe("extracting");
    expect(bucket._has(`originals/${id}/source.pdf`)).toBe(true);
  });

  it("upload kedua ke buku yang sudah diproses → 409", async () => {
    const { env, cookie } = await setup();
    const { id } = await createBook(env, cookie);
    await upload(env, cookie, id, PDF);
    expect((await upload(env, cookie, id, PDF)).status).toBe(409);
  });

  it("Content-Length tidak sama dengan ukuran deklarasi → 400, tidak ada objek", async () => {
    const { env, cookie, bucket } = await setup();
    const { id } = await createBook(env, cookie);
    const res = await upload(env, cookie, id, PDF, PDF.length + 1);
    expect(res.status).toBe(400);
    expect(bucket._keys()).toHaveLength(0);
  });

  it("checksum salah → 400, objek tidak tersimpan, status failed, bisa dicoba lagi", async () => {
    const { env, cookie, bucket } = await setup();
    const { id } = await createBook(env, cookie);
    const tampered = new Uint8Array(PDF);
    tampered[10] = tampered[10]! ^ 0xff;
    const res = await upload(env, cookie, id, tampered);
    expect(res.status).toBe(400);
    expect(bucket._keys()).toHaveLength(0);
    const detail = (await (await call(env, `/api/books/${id}`, { cookie })).json()) as {
      book: { status: string; failureReason: string };
    };
    expect(detail.book.status).toBe("failed");
    expect(detail.book.failureReason).toBeTruthy();
  });

  it("isi tidak sesuai ekstensi (bukan PDF padahal .pdf) → 400 dan objek dibuang", async () => {
    const { env, cookie, bucket } = await setup();
    const fake = enc.encode("ini bukan pdf sama sekali");
    const { id } = await createBook(env, cookie, fake, "pdf");
    expect((await upload(env, cookie, id, fake)).status).toBe(400);
    expect(bucket._keys()).toHaveLength(0);
  });

  it("EPUB valid (signature ZIP) diterima", async () => {
    const { env, cookie } = await setup();
    const epub = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]);
    const { id } = await createBook(env, cookie, epub, "epub");
    expect((await upload(env, cookie, id, epub)).status).toBe(200);
  });
});

describe("DELETE /api/books/:id", () => {
  it("menghapus semua objek R2 buku itu dan baris D1; buku lain tidak tersentuh", async () => {
    const { env, cookie, bucket } = await setup();
    const a = await createBook(env, cookie);
    const b = await createBook(env, cookie);
    await upload(env, cookie, a.id, PDF);
    await upload(env, cookie, b.id, PDF);
    bucket._put(`extracted/${a.id}/1/span.json`, enc.encode("{}"));
    bucket._put(`translations/${a.id}/id-ID/1/u.json`, enc.encode("{}"));

    const res = await call(env, `/api/books/${a.id}`, { method: "DELETE", cookie });
    expect(res.status).toBe(200);
    expect(bucket._keys().filter((k) => k.includes(a.id))).toHaveLength(0);
    expect(bucket._has(`originals/${b.id}/source.pdf`)).toBe(true);
    expect((await call(env, `/api/books/${a.id}`, { cookie })).status).toBe(404);
    expect((await call(env, `/api/books/${b.id}`, { cookie })).status).toBe(200);
    expect((await call(env, `/api/books/${a.id}`, { method: "DELETE", cookie })).status).toBe(404);
  });

  it("hapus lintas-origin ditolak (CSRF) dan buku tetap ada", async () => {
    const { env, cookie } = await setup();
    const { id } = await createBook(env, cookie);
    const res = await call(env, `/api/books/${id}`, {
      method: "DELETE",
      cookie,
      origin: "https://evil.example",
    });
    expect(res.status).toBe(403);
    expect((await call(env, `/api/books/${id}`, { cookie })).status).toBe(200);
  });
});
