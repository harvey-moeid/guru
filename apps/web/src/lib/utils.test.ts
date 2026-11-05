import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("menggabungkan class dan membuang nilai falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("mengembalikan string kosong jika semua falsy", () => {
    expect(cn(false, undefined)).toBe("");
  });
});
