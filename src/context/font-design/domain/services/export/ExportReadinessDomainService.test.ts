import { describe, expect, it } from "vitest";
import { Typeface } from "../../entities/Typeface";
import { FontMetrics } from "../../value-objects/FontMetrics";
import { TypefaceId } from "../../value-objects/TypefaceId";
import { TypefaceMetadata } from "../../value-objects/TypefaceMetadata";
import { ExportReadinessDomainService } from "./ExportReadinessDomainService";

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

describe("ExportReadinessDomainService", () => {
  it("reporta errores y warnings esperados para minimal-latin", () => {
    const service = new ExportReadinessDomainService();
    const report = service.validate(createEmptyTypeface(), "minimal-latin");

    expect(report.isReady).toBe(false);
    expect(report.errors.some((x) => x.code === "NO_OUTLINED_GLYPHS")).toBe(true);
    expect(report.warnings.some((x) => x.code === "MISSING_PRESET_GLYPH")).toBe(true);
  });
});

