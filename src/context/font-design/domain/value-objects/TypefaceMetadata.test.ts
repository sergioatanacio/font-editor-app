import { describe, expect, it } from "vitest";
import { TypefaceMetadata } from "./TypefaceMetadata";

describe("TypefaceMetadata", () => {
  it("normaliza kerningPairs y elimina valores cero", () => {
    const result = TypefaceMetadata.create({
      familyName: "Demo",
      styleName: "Regular",
      kerningPairs: {
        "A::V": -80.4,
        "T::a": 0,
        "W::o": 3000,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.kerningPairs).toEqual({
      "A::V": -80,
      "W::o": 1000,
    });
  });

  it("rechaza kerningPairs con valores no numericos", () => {
    const result = TypefaceMetadata.create({
      familyName: "Demo",
      styleName: "Regular",
      kerningPairs: {
        "A::V": Number.NaN,
      },
    });
    expect(result.ok).toBe(false);
  });
});
