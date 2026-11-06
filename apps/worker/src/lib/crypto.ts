/**
 * Primitif kripto (Web Crypto, tersedia di Workers dan Node 22).
 * Algoritma verifier HARUS sama dengan scripts/lib/password.mjs:
 *   hex( HMAC-SHA-256( key = AUTH_PEPPER, msg = password ) )
 */
const encoder = new TextEncoder();

export function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

/** Token acak kriptografis (default 32 byte = 256 bit), base64url. */
export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * Perbandingan waktu-konstan terhadap panjang terpanjang.
 * (Panjang verifier/hash bukan rahasia; yang dilindungi adalah isinya.)
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
