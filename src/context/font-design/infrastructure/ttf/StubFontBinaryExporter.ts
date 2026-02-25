import type { ExportIssue, FontBinaryExporter } from "../../domain/ports";
import type { Typeface } from "../../domain/entities/Typeface";

export class StubFontBinaryExporter implements FontBinaryExporter {
  async exportTtf(typeface: Typeface): Promise<{ bytes: Uint8Array; warnings: ExportIssue[] }> {
    const payload = {
      typefaceId: typeface.id.toString(),
      familyName: typeface.metadata.familyName,
      styleName: typeface.metadata.styleName,
      glyphCount: typeface.glyphs.size,
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const warnings: ExportIssue[] =
      typeface.glyphs.size === 0
        ? [
            {
              code: "EMPTY_GLYPH_SET",
              message: "La fuente no contiene glifos trazados.",
              severity: "warning",
            },
          ]
        : [];

    return { bytes, warnings };
  }
}
