// Pustaka murni untuk scripts/setup-password (B1). Tanpa I/O, mudah diuji.
// Algoritma verifier HARUS sama dengan apps/worker/src/lib/crypto.ts:
//   AUTH_PASSWORD_HASH = hex( HMAC-SHA-256( key = AUTH_PEPPER, msg = password ) )
import { createHmac, randomBytes, randomInt } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 24;
export const GENERATED_PASSWORD_LENGTH = 32;
export const MIN_ENTROPY_BITS = 100;

// Tanpa karakter mirip (0/O, 1/l/I) agar mudah diketik ulang dari password manager.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Password acak seragam (randomInt memakai rejection sampling, tanpa modulo bias). */
export function generatePassword(length = GENERATED_PASSWORD_LENGTH) {
  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH) {
    throw new RangeError(`Panjang password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  }
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Secret acak (pepper / signing secret), base64url tanpa padding. */
export function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Verifier: HMAC-SHA-256(pepper, password) dalam hex. */
export function hashPassword(password, pepper) {
  return createHmac("sha256", pepper).update(password, "utf8").digest("hex");
}

/**
 * Perkiraan kasar entropi (bit) dari ukuran kumpulan karakter dan panjang efektif.
 * Ini heuristik, BUKAN jaminan: passphrase kata-kata biasa akan terestimasi terlalu tinggi.
 */
export function estimateEntropyBits(password) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[ -/:-@[-`{-~]/.test(password)) pool += 33;
  if (/[^\x20-\x7e]/.test(password)) pool += 100;
  if (pool === 0) return 0;
  const distinct = new Set(password).size;
  // Penalti pengulangan: panjang efektif dibatasi 2x jumlah karakter unik.
  const effective = Math.min(password.length, distinct * 2);
  return Math.floor(effective * Math.log2(pool));
}

const WEAK_SEQUENCES = [
  "0123",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "abcd",
  "qwer",
  "asdf",
  "zxcv",
  "password",
];

/** Validasi password buatan pemilik. Mengembalikan { ok, bits, problems }. */
export function validatePassword(password) {
  const problems = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Terlalu pendek: ${password.length} karakter (minimal ${MIN_PASSWORD_LENGTH}).`);
  }
  if (password !== password.trim()) {
    problems.push("Ada spasi di awal/akhir; hapus agar tidak salah ketik saat login.");
  }
  if (new Set(password).size < 12) {
    problems.push("Terlalu banyak karakter berulang (minimal 12 karakter unik).");
  }
  if (/(.)\1{3,}/.test(password)) {
    problems.push("Ada karakter yang sama berulang 4x berturut-turut.");
  }
  const lower = password.toLowerCase();
  if (WEAK_SEQUENCES.some((s) => lower.includes(s))) {
    problems.push(
      "Mengandung pola mudah ditebak (urutan angka/huruf/papan ketik/kata 'password').",
    );
  }
  const bits = estimateEntropyBits(password);
  if (bits < MIN_ENTROPY_BITS) {
    problems.push(`Perkiraan entropi ${bits} bit (minimal ${MIN_ENTROPY_BITS}).`);
  }
  return { ok: problems.length === 0, bits, problems };
}
