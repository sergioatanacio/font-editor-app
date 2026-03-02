/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SvgGlyphVectorImporterAdapter } from "./SvgGlyphVectorImporterAdapter";

function fixture(name: string): string {
  const path = resolve(process.cwd(), "test-assets", "svg", name);
  return readFileSync(path, "utf-8");
}

function inlineSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
  <metadata>{"templateSchemaVersion":"1.0.0","typefaceId":"tf_test","templateCharacterPreset":"latam-alnum","templateCharacterSelection":{"includeLatamAlnum":true,"includeCodeChars":false},"unitsPerEm":1000,"grid":{"cols":2,"rows":1,"cellWidth":120,"cellHeight":120,"padding":12},"glyphCount":2}</metadata>
  <g id="ctf-template-root">
    <g id="cell-A" data-role="glyph-cell" data-glyph-id="A" data-glyph-name="A" data-codepoint="65" data-kind="base" data-slot-index="0">
      <g data-role="guides"></g>
      <g data-role="drawing"></g>
      <g data-role="label"></g>
    </g>
    <g id="cell-space" data-role="glyph-cell" data-glyph-id="space" data-glyph-name="space" data-codepoint="32" data-kind="space" data-slot-index="1">
      <g data-role="guides"></g>
      <g data-role="drawing"></g>
      <g data-role="label"></g>
    </g>
    ${body}
  </g>
</svg>`;
}

describe("SvgGlyphVectorImporterAdapter", () => {
  it("importa fixture valido basico", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const result = await adapter.importFromSvg(fixture("valid-basic.svg"), {
      requiredGlyphIds: ["A", "space"],
    });

    expect(result.isBlocking).toBe(false);
    expect(result.items.length).toBe(2);
    expect(result.preview.some((x) => x.glyphId === "A" && (x.status === "ok" || x.status === "warning"))).toBe(true);
  });

  it("importa fixture con transforms", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const result = await adapter.importFromSvg(fixture("valid-transforms.svg"), {
      requiredGlyphIds: ["A"],
    });

    expect(result.isBlocking).toBe(false);
    expect(result.items[0]?.outline?.contours.length ?? 0).toBeGreaterThan(0);
  });

  it("falla cuando falta root canonic", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const result = await adapter.importFromSvg(fixture("invalid-missing-root.svg"), {});

    expect(result.isBlocking).toBe(true);
    expect(result.globalIssues.some((i) => i.code === "MISSING_TEMPLATE_ROOT")).toBe(true);
  });

  it("marca error bloqueante por contorno abierto", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const result = await adapter.importFromSvg(fixture("invalid-open-contour.svg"), {
      requiredGlyphIds: ["A"],
    });

    expect(result.isBlocking).toBe(true);
    expect(result.items.flatMap((x) => x.issues).some((i) => i.code === "OPEN_CONTOUR")).toBe(true);
  });

  it("acepta contorno cerrado geometricamente aunque no termine en Z", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const svg = inlineSvg(`<path id="closed-by-endpoint" d="M12 108 L60 12 L108 108 L12 108" />`);
    const result = await adapter.importFromSvg(svg, { requiredGlyphIds: ["A"] });

    expect(result.isBlocking).toBe(false);
    const itemA = result.items.find((x) => x.glyphId === "A");
    expect(itemA?.issues.some((i) => i.code === "OPEN_CONTOUR")).toBe(false);
    expect(itemA?.outline?.contours.length ?? 0).toBeGreaterThan(0);
  });

  it("asigna por interseccion al glifo con mayor solapamiento", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const svg = inlineSvg(`<path id="crossing" d="M100 60 L200 60 L200 100 L100 100 Z" />`);
    const result = await adapter.importFromSvg(svg, { requiredGlyphIds: ["A", "space"] });

    expect(result.isBlocking).toBe(false);
    const itemA = result.items.find((x) => x.glyphId === "A");
    const itemSpace = result.items.find((x) => x.glyphId === "space");
    expect(itemA?.outline?.contours.length ?? 0).toBe(0);
    expect(itemSpace?.outline?.contours.length ?? 0).toBeGreaterThan(0);
  });

  it("ignora paths fuera de celdas y reporta warning global", async () => {
    const adapter = new SvgGlyphVectorImporterAdapter();
    const svg = inlineSvg(`<path id="outside-far" d="M700 108 L740 20 L780 108 Z" />`);
    const result = await adapter.importFromSvg(svg, { requiredGlyphIds: ["A", "space"] });

    expect(result.isBlocking).toBe(false);
    expect(result.preview.length).toBe(2);
    expect(result.globalIssues.some((i) => i.code === "PATH_OUTSIDE_GLYPH_CELLS")).toBe(true);
    const itemA = result.items.find((x) => x.glyphId === "A");
    const itemSpace = result.items.find((x) => x.glyphId === "space");
    expect(itemA?.outline?.contours.length ?? 0).toBe(0);
    expect(itemSpace?.outline?.contours.length ?? 0).toBe(0);
  });
});
