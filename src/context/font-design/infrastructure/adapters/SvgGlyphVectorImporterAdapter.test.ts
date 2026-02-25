/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SvgGlyphVectorImporterAdapter } from "./SvgGlyphVectorImporterAdapter";

function fixture(name: string): string {
  const path = resolve(process.cwd(), "test-assets", "svg", name);
  return readFileSync(path, "utf-8");
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
});
