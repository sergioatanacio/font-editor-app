import { describe, expect, it } from "vitest";
import type { GlyphOutlineSnapshot } from "../context/font-design/domain/ports";
import { applyTransformToOutline } from "./outlineTransform";

const OUTLINE: GlyphOutlineSnapshot = {
  contours: [[
    { type: "M", values: [0, 0] },
    { type: "L", values: [100, 0] },
    { type: "L", values: [100, 100] },
    { type: "Z", values: [] },
  ]],
};

describe("outline transform", () => {
  it("aplica translate", () => {
    const out = applyTransformToOutline(OUTLINE, { moveX: 10, moveY: -5, scale: 1 }, 0, 0);
    expect(out.contours[0]?.[0]?.values).toEqual([10, -5]);
    expect(out.contours[0]?.[1]?.values).toEqual([110, -5]);
  });

  it("aplica scale alrededor de pivote", () => {
    const out = applyTransformToOutline(OUTLINE, { moveX: 0, moveY: 0, scale: 2 }, 50, 50);
    expect(out.contours[0]?.[0]?.values).toEqual([-50, -50]);
    expect(out.contours[0]?.[2]?.values).toEqual([150, 150]);
  });

  it("mantiene Z sin coordenadas", () => {
    const out = applyTransformToOutline(OUTLINE, { moveX: 3, moveY: 4, scale: 1.2 }, 0, 0);
    expect(out.contours[0]?.[3]?.type).toBe("Z");
    expect(out.contours[0]?.[3]?.values).toEqual([]);
  });
});

