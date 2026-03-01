import { describe, expect, it } from "vitest";
import { TemplateCharacterDomainService } from "./TemplateCharacterDomainService";

describe("TemplateCharacterDomainService", () => {
  const service = new TemplateCharacterDomainService();

  it("deriva preset desde seleccion", () => {
    expect(service.derivePreset({ includeLatamAlnum: true, includeCodeChars: false })).toBe("latam-alnum");
    expect(service.derivePreset({ includeLatamAlnum: false, includeCodeChars: true })).toBe("code-dev");
    expect(service.derivePreset({ includeLatamAlnum: true, includeCodeChars: true })).toBe("latam-plus-code");
  });

  it("construye catalogo base para latam-alnum", () => {
    const chars = service.buildCharacters({ includeLatamAlnum: true, includeCodeChars: false });
    expect(chars.some((x) => x.glyphName === ".notdef")).toBe(true);
    expect(chars.some((x) => x.glyphName === "A")).toBe(true);
    expect(chars.some((x) => x.glyphName === "space")).toBe(false);
    expect(chars.some((x) => x.glyphName === "u0020")).toBe(true);
  });
});

