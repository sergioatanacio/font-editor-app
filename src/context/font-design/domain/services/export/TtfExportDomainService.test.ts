import { describe, expect, it } from "vitest";
import { Glyph } from "../../entities/Glyph";
import { Typeface } from "../../entities/Typeface";
import { FontMetrics } from "../../value-objects/FontMetrics";
import { GlyphId } from "../../value-objects/GlyphId";
import { GlyphMetrics } from "../../value-objects/GlyphMetrics";
import { GlyphName } from "../../value-objects/GlyphName";
import { TypefaceId } from "../../value-objects/TypefaceId";
import { TypefaceMetadata } from "../../value-objects/TypefaceMetadata";
import { UnicodeCodePoint } from "../../value-objects/UnicodeCodePoint";
import { TtfExportDomainService } from "./TtfExportDomainService";

function must<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function buildGlyph(id: string, name: string, unicode?: number): Glyph {
  return must(
    Glyph.create({
      id: must(GlyphId.create(id)),
      name: must(GlyphName.create(name)),
      kind: name === "space" ? "space" : "base",
      metrics: must(
        GlyphMetrics.create({
          advanceWidth: 600,
          leftSideBearing: 10,
        }),
      ),
      unicode: unicode == null ? undefined : must(UnicodeCodePoint.create(unicode)),
    }),
  );
}

function buildTypeface(glyphs: Glyph[]): Typeface {
  return must(
    Typeface.create({
      id: must(TypefaceId.create("tf_test")),
      metadata: must(TypefaceMetadata.create({ familyName: "Demo", styleName: "Regular" })),
      metrics: must(
        FontMetrics.create({
          unitsPerEm: 1000,
          ascender: 800,
          descender: -200,
          lineGap: 200,
          baseline: 0,
        }),
      ),
      glyphs,
    }),
  );
}

describe("TtfExportDomainService", () => {
  it("ordena .notdef primero y space segundo", () => {
    const service = new TtfExportDomainService();
    const typeface = buildTypeface([
      buildGlyph("A", "A", 0x41),
      buildGlyph("space", "space", 0x20),
      buildGlyph(".notdef", ".notdef"),
      buildGlyph("B", "B", 0x42),
    ]);

    const plan = service.createGlyphPlan(typeface);
    const orderedNames = plan.orderedGlyphs.map((glyph) => glyph.name.toString());

    expect(plan.shouldInjectNotdef).toBe(false);
    expect(orderedNames[0]).toBe(".notdef");
    expect(orderedNames[1]).toBe("space");
  });

  it("indica inyeccion de .notdef cuando falta", () => {
    const service = new TtfExportDomainService();
    const typeface = buildTypeface([buildGlyph("A", "A", 0x41)]);

    const plan = service.createGlyphPlan(typeface);

    expect(plan.shouldInjectNotdef).toBe(true);
    expect(plan.orderedGlyphs[0].name.toString()).toBe("A");
  });
});
