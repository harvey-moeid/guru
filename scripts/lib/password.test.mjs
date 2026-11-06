import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  estimateEntropyBits,
  generatePassword,
  generateSecret,
  hashPassword,
  validatePassword,
} from "./password.mjs";

test("hashPassword cocok dengan vektor uji RFC 4231 (kasus 2)", () => {
  assert.equal(
    hashPassword("what do ya want for nothing?", "Jefe"),
    "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  );
});

test("generatePassword: panjang benar, tanpa karakter mirip, berbeda tiap panggilan", () => {
  const a = generatePassword();
  const b = generatePassword();
  assert.equal(a.length, 32);
  assert.match(a, /^[A-HJ-NP-Za-km-z2-9]+$/);
  assert.notEqual(a, b);
  assert.equal(validatePassword(a).ok, true);
  assert.throws(() => generatePassword(12), RangeError);
});

test("generateSecret: base64url 32 byte, unik", () => {
  const s = generateSecret();
  assert.match(s, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(s, generateSecret());
});

test("validatePassword menolak password lemah", () => {
  assert.equal(validatePassword("pendek123").ok, false);
  assert.equal(validatePassword("a".repeat(30)).ok, false);
  assert.equal(validatePassword("passwordpasswordpassword12345").ok, false);
  assert.equal(validatePassword(" Xk9mQ2vLw8Rt4YnB7sHd3FjC5pZa ").ok, false);
  const ok = validatePassword("Xk9mQ2vLw8Rt4YnB7sHd3FjC5pZa");
  assert.equal(ok.ok, true, ok.problems.join("; "));
});

test("estimateEntropyBits menghukum pengulangan", () => {
  assert.ok(
    estimateEntropyBits("abababababababababababababab") <
      estimateEntropyBits("Xk9mQ2vLw8Rt4YnB7sHd3FjC5pZa"),
  );
  assert.equal(estimateEntropyBits(""), 0);
});

test("CLI: mode acak mencetak 3 secret dan password; verifier konsisten", () => {
  const script = fileURLToPath(new URL("../setup-password.mjs", import.meta.url));
  const out = execFileSync(process.execPath, [script], { encoding: "utf8" });
  const grab = (re) => out.match(re)?.[1];
  const password = grab(/PASSWORD LOGIN[^\n]*\n {2}(\S+)/);
  const pepper = grab(/AUTH_PEPPER=(\S+)/);
  const verifier = grab(/AUTH_PASSWORD_HASH=(\S+)/);
  assert.ok(password && pepper && verifier);
  assert.equal(hashPassword(password, pepper), verifier);
});

test("CLI --check: tolak password lemah (exit 1), terima password kuat tanpa mencetaknya", () => {
  const script = fileURLToPath(new URL("../setup-password.mjs", import.meta.url));
  assert.throws(() =>
    execFileSync(process.execPath, [script, "--check"], { input: "lemah", stdio: "pipe" }),
  );
  const strong = "Xk9mQ2vLw8Rt4YnB7sHd3FjC5pZa";
  const out = execFileSync(process.execPath, [script, "--check"], {
    input: strong + "\n",
    encoding: "utf8",
  });
  assert.ok(!out.includes("PASSWORD LOGIN"));
  assert.ok(!out.includes(strong));
  assert.match(out, /AUTH_PASSWORD_HASH=[0-9a-f]{64}/);
});
