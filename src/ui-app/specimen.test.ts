import { describe, expect, it } from "vitest";
import type { TypefaceSnapshot } from "../context/font-design/domain/ports";
import { layoutSpecimen, outlineBounds } from "./specimen";

const TRIANGLE = {
  contours: [[
    { type: "M" as const, values: [0, 0] },
    { type: "L" as const, values: [100, 200] },
    { type: "L" as const, values: [200, 0] },
    { type: "Z" as const, values: [] },
  ]],
};

function fixtureTypeface(): TypefaceSnapshot {
  return {
    id: "tf-1",
    metadata: { familyName: "Test", styleName: "Regular" },
    metrics: {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 200,
      baseline: 0,
    },
    glyphs: [
      {
        id: ".notdef",
        name: ".notdef",
        kind: "base",
        metrics: { advanceWidth: 500, leftSideBearing: 0 },
        outline: TRIANGLE,
      },
      {
        id: "A",
        name: "A",
        kind: "base",
        metrics: { advanceWidth: 600, leftSideBearing: 10 },
        outline: TRIANGLE,
        unicodeCodePoint: 65,
      },
      {
        id: "V",
        name: "V",
        kind: "base",
        metrics: { advanceWidth: 620, leftSideBearing: 5 },
        outline: TRIANGLE,
        unicodeCodePoint: 86,
      },
    ],
  };
}

describe("specimen layout", () => {
  it("resuelve unicode a glifo y calcula avance", () => {
    const result = layoutSpecimen(fixtureTypeface(), "AA");
    expect(result.items.length).toBe(2);
    expect(result.items[0]?.glyphId).toBe("A");
    expect(result.items[1]?.x).toBeGreaterThan(result.items[0]?.x ?? 0);
  });

  it("usa fallback cuando falta unicode", () => {
    const result = layoutSpecimen(fixtureTypeface(), "B");
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.glyphId).toBe(".notdef");
  });

  it("aplica interletrado entre glifos", () => {
    const normal = layoutSpecimen(fixtureTypeface(), "AA", 0);
    const compact = layoutSpecimen(fixtureTypeface(), "AA", -80);
    const expanded = layoutSpecimen(fixtureTypeface(), "AA", 120);
    const normalDelta = (normal.items[1]?.x ?? 0) - (normal.items[0]?.x ?? 0);
    const compactDelta = (compact.items[1]?.x ?? 0) - (compact.items[0]?.x ?? 0);
    const expandedDelta = (expanded.items[1]?.x ?? 0) - (expanded.items[0]?.x ?? 0);
    expect(compactDelta).toBe(normalDelta - 80);
    expect(expandedDelta).toBe(normalDelta + 120);
  });

  it("aplica kerning por par entre glifos adyacentes", () => {
    const base = layoutSpecimen(fixtureTypeface(), "AVA", 0, {});
    const kerned = layoutSpecimen(fixtureTypeface(), "AVA", 0, { "A::V": -70 });
    const deltaBase = (base.items[1]?.x ?? 0) - (base.items[0]?.x ?? 0);
    const deltaKerned = (kerned.items[1]?.x ?? 0) - (kerned.items[0]?.x ?? 0);
    const secondPairBase = (base.items[2]?.x ?? 0) - (base.items[1]?.x ?? 0);
    const secondPairKerned = (kerned.items[2]?.x ?? 0) - (kerned.items[1]?.x ?? 0);
    expect(deltaKerned).toBe(deltaBase - 70);
    expect(secondPairKerned).toBe(secondPairBase);
  });

  it("calcula bounds del outline", () => {
    const bounds = outlineBounds(TRIANGLE);
    expect(bounds).toEqual({ xMin: 0, yMin: 0, xMax: 200, yMax: 200 });
  });
});

