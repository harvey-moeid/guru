import { describe, expect, it } from "vitest";
import { hashSourceFile } from "./extract";

describe("book extraction helpers", () => {
  it("computes a stable SHA-256 checksum for the source file", async () => {
    const file = new File(["hello"], "hello.pdf", { type: "application/pdf" });
    await expect(hashSourceFile(file)).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
