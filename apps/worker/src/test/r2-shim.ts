/**
 * R2 tiruan di memori untuk tes. Meniru perilaku yang dipakai worker: put dengan
 * verifikasi sha256 (error bila tidak cocok, seperti R2 asli), head, get dengan range,
 * list berprefix, delete satu/banyak kunci. BUKAN R2 asli.
 */
import { sha256Hex } from "./sha";

export function createTestBucket(): R2Bucket {
  const store = new Map<string, Uint8Array>();
  const bucket = {
    async put(
      key: string,
      value: ReadableStream | ArrayBuffer | string | null,
      opts?: { sha256?: string },
    ) {
      const bytes = new Uint8Array(await new Response(value).arrayBuffer());
      if (opts?.sha256 && (await sha256Hex(bytes)) !== opts.sha256.toLowerCase()) {
        throw new Error("The SHA-256 checksum you specified did not match what we received.");
      }
      store.set(key, bytes);
      return { key, size: bytes.length };
    },
    async head(key: string) {
      const b = store.get(key);
      return b ? { key, size: b.length } : null;
    },
    async get(key: string, opts?: { range?: { offset: number; length: number } }) {
      const b = store.get(key);
      if (!b) return null;
      const part = opts?.range
        ? b.slice(opts.range.offset, opts.range.offset + opts.range.length)
        : b;
      return {
        arrayBuffer: async () => part.buffer.slice(part.byteOffset, part.byteOffset + part.length),
      };
    },
    async list(opts?: { prefix?: string }) {
      const objects = [...store.keys()]
        .filter((k) => k.startsWith(opts?.prefix ?? ""))
        .map((key) => ({ key }));
      return { objects, truncated: false };
    },
    async delete(keys: string | string[]) {
      for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
    },
    /** Hanya untuk tes: cek/isi langsung. */
    _has: (key: string) => store.has(key),
    _put: (key: string, bytes: Uint8Array) => void store.set(key, bytes),
    _keys: () => [...store.keys()],
  };
  return bucket as unknown as R2Bucket;
}

export type TestBucket = ReturnType<typeof createTestBucket> & {
  _has(key: string): boolean;
  _put(key: string, bytes: Uint8Array): void;
  _keys(): string[];
};
