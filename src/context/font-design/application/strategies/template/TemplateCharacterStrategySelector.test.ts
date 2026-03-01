import { describe, expect, it } from "vitest";
import {
  deriveTemplateCharacterPreset,
  TemplateCharacterStrategySelector,
} from "./TemplateCharacterStrategySelector";

describe("TemplateCharacterStrategySelector", () => {
  it("deriva preset desde checks", () => {
    expect(deriveTemplateCharacterPreset({ includeLatamAlnum: true, includeCodeChars: false })).toBe("latam-alnum");
    expect(deriveTemplateCharacterPreset({ includeLatamAlnum: false, includeCodeChars: true })).toBe("code-dev");
    expect(deriveTemplateCharacterPreset({ includeLatamAlnum: true, includeCodeChars: true })).toBe("latam-plus-code");
  });

  it("resuelve estrategia y construye caracteres", () => {
    const selector = new TemplateCharacterStrategySelector();
    const chars = selector.byPreset("latam-alnum").buildCharacters({
      includeLatamAlnum: true,
      includeCodeChars: false,
    });

    expect(chars.length).toBeGreaterThan(0);
    expect(chars.some((x) => x.glyphName === ".notdef")).toBe(true);
    expect(chars.some((x) => x.glyphName === "A")).toBe(true);
  });
});

