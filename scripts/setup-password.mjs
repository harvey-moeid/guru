#!/usr/bin/env node
// B1 — Siapkan kredensial login single-user. TIDAK menulis file apa pun dan TIDAK
// menyimpan password; semua nilai hanya dicetak ke terminal untuk Anda salin.
//
// Pemakaian:
//   node scripts/setup-password.mjs            -> buat password acak 32 karakter
//   node scripts/setup-password.mjs --check    -> validasi password buatan sendiri
//                                                 (dibaca dari stdin/prompt, bukan argumen
//                                                 agar tidak tersimpan di riwayat shell)
import { createInterface } from "node:readline";
import {
  MIN_ENTROPY_BITS,
  MIN_PASSWORD_LENGTH,
  generatePassword,
  generateSecret,
  hashPassword,
  validatePassword,
} from "./lib/password.mjs";

const args = process.argv.slice(2);
const checkMode = args.includes("--check");

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "Pemakaian: node scripts/setup-password.mjs [--check]\n" +
      `  (tanpa opsi) buat password acak.\n  --check      validasi password buatan sendiri (min ${MIN_PASSWORD_LENGTH} karakter, ~${MIN_ENTROPY_BITS} bit).`,
  );
  process.exit(0);
}

async function readPassword() {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks)
      .toString("utf8")
      .replace(/\r?\n$/, "");
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise((resolve) =>
    rl.question("Ketik password (terlihat di layar, pastikan tidak ada yang mengintip): ", resolve),
  );
  rl.close();
  return answer;
}

let password;
let generated = false;
if (checkMode) {
  password = await readPassword();
  const result = validatePassword(password);
  if (!result.ok) {
    console.error("Password DITOLAK:");
    for (const p of result.problems) console.error(`  - ${p}`);
    console.error("Jalankan tanpa --check untuk membuat password acak yang kuat.");
    process.exit(1);
  }
  console.error(`Password diterima (perkiraan entropi ~${result.bits} bit, heuristik kasar).`);
} else {
  password = generatePassword();
  generated = true;
}

const pepper = generateSecret();
const signingSecret = generateSecret();
const verifier = hashPassword(password, pepper);

const lines = [];
lines.push("=== BYGA AI Guru Privat — kredensial login ===", "");
if (generated) {
  lines.push(
    "PASSWORD LOGIN (simpan di password manager; tidak disimpan di mana pun dan tidak akan ditampilkan lagi):",
    `  ${password}`,
    "",
  );
}
lines.push(
  "Set 3 secret ke Cloudflare. Jalankan satu per satu dan TEMPEL nilainya saat diminta",
  "(jangan taruh nilai di argumen perintah agar tidak masuk riwayat shell):",
  "",
  "  cd apps/worker",
  "  pnpm wrangler secret put AUTH_PEPPER",
  `    nilai: ${pepper}`,
  "  pnpm wrangler secret put AUTH_PASSWORD_HASH",
  `    nilai: ${verifier}`,
  "  pnpm wrangler secret put SESSION_SIGNING_SECRET",
  `    nilai: ${signingSecret}`,
  "",
  "Untuk dev lokal, isi apps/worker/.dev.vars (sudah di .gitignore; JANGAN di-commit):",
  "",
  `  AUTH_PEPPER=${pepper}`,
  `  AUTH_PASSWORD_HASH=${verifier}`,
  `  SESSION_SIGNING_SECRET=${signingSecret}`,
  "",
  "Catatan: ganti password = jalankan ulang skrip ini, set ulang ketiga secret, lalu deploy.",
  "Semua session lama otomatis tidak valid karena SESSION_SIGNING_SECRET berubah.",
  "Bersihkan layar/riwayat terminal setelah menyalin nilai di atas.",
);
console.log(lines.join("\n"));
