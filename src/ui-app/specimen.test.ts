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

  it("calcula bounds del outline", () => {
    const bounds = outlineBounds(TRIANGLE);
    expect(bounds).toEqual({ xMin: 0, yMin: 0, xMax: 200, yMax: 200 });
  });
});

