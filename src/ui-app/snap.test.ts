import { describe, expect, it } from "vitest";
import { snapScale, snapValue } from "./snap";

describe("snap", () => {
  it("snap baseline cerca de cero", () => {
    const v = snapValue(8, { baseline: true, grid: false, gridSize: 10, baselineTolerance: 12 });
    expect(v).toBe(0);
  });

  it("snap grid redondea a paso", () => {
    const v = snapValue(23, { baseline: false, grid: true, gridSize: 10 });
    expect(v).toBe(20);
  });

  it("scale clamped", () => {
    expect(snapScale(0.01)).toBe(0.1);
    expect(snapScale(9)).toBe(8);
  });
});

