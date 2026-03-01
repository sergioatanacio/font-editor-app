import { describe, expect, it } from "vitest";
import { Typeface } from "../../../domain/entities/Typeface";
import { FontMetrics } from "../../../domain/value-objects/FontMetrics";
import { TypefaceId } from "../../../domain/value-objects/TypefaceId";
import { TypefaceMetadata } from "../../../domain/value-objects/TypefaceMetadata";
import { ExportReadinessStrategySelector } from "./ExportReadinessStrategySelector";

function createEmptyTypeface(): Typeface {
  const id = TypefaceId.create("tf_test");
  if (!id.ok) {
    throw new Error(id.error.message);
  }
  const metadata = TypefaceMetadata.create({ familyName: "Demo", styleName: "Regular" });
  if (!metadata.ok) {
    throw new Error(metadata.error.message);
  }
  const metrics = FontMetrics.create({
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    lineGap: 200,
    baseline: 0,
  });
  if (!metrics.ok) {
    throw new Error(metrics.error.message);
  }
  const typeface = Typeface.create({
    id: id.value,
    metadata: metadata.value,
    metrics: metrics.value,
    glyphs: [],
  });
  if (!typeface.ok) {
    throw new Error(typeface.error.message);
  }
  return typeface.value;
}

describe("ExportReadinessStrategySelector", () => {
  it("resuelve estrategia por preset y valida resultado esperado", () => {
    const selector = new ExportReadinessStrategySelector();
    const typeface = createEmptyTypeface();

    const minimal = selector.byPreset("minimal-latin").validate(typeface);
    const freeform = selector.byPreset("freeform").validate(typeface);

    expect(minimal.errors.some((x) => x.code === "NO_OUTLINED_GLYPHS")).toBe(true);
    expect(minimal.warnings.some((x) => x.code === "MISSING_PRESET_GLYPH")).toBe(true);
    expect(freeform.errors.some((x) => x.code === "NO_OUTLINED_GLYPHS")).toBe(true);
  });
});

