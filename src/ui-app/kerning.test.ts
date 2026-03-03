import { describe, expect, it } from "vitest";
import {
  clampKerningValue,
  getPairKerning,
  pairKey,
  parsePairKey,
  removePairKerning,
  setPairKerning,
} from "./kerning";

describe("kerning helpers", () => {
  it("normaliza clave de par", () => {
    expect(pairKey(" A ", " V ")).toBe("A::V");
    expect(parsePairKey("A::V")).toEqual({ leftGlyphId: "A", rightGlyphId: "V" });
    expect(parsePairKey("::V")).toBeNull();
    expect(parsePairKey("A::")).toBeNull();
    expect(parsePairKey("A::V::X")).toBeNull();
  });

  it("clamp de valor", () => {
    expect(clampKerningValue(12.7)).toBe(13);
    expect(clampKerningValue(-1001)).toBe(-1000);
    expect(clampKerningValue(2000)).toBe(1000);
    expect(clampKerningValue(Number.NaN)).toBe(0);
  });

  it("set/get/remove de par", () => {
    const initial = {};
    const withAv = setPairKerning(initial, "A", "V", -80);
    expect(getPairKerning(withAv, "A", "V")).toBe(-80);
    const withZero = setPairKerning(withAv, "A", "V", 0);
    expect(getPairKerning(withZero, "A", "V")).toBe(0);
    const withTa = setPairKerning(withZero, "T", "a", -40);
    expect(getPairKerning(withTa, "T", "a")).toBe(-40);
    const removed = removePairKerning(withTa, "T", "a");
    expect(getPairKerning(removed, "T", "a")).toBe(0);
  });
});
