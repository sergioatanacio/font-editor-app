import { describe, expect, it } from "vitest";
import { FontMetrics } from "./FontMetrics";

describe("FontMetrics", () => {
  it("acepta baseline en 0", () => {
    const result = FontMetrics.create({
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 200,
      baseline: 0,
    });

    expect(result.ok).toBe(true);
  });
});
