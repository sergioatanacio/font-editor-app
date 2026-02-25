import type { TemplateExporter } from "../../domain/ports";

interface TemplateSpecLike {
  typefaceId: string;
  templateCharacterPreset: string;
  templateCharacterSelection: {
    includeLatamAlnum: boolean;
    includeCodeChars: boolean;
  };
  unitsPerEm: number;
  grid: {
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    padding: number;
  };
  glyphSlots: ReadonlyArray<{
    glyphId: string;
    glyphName: string;
    codePoint?: number;
    kind: "base" | "mark" | "ligature" | "space";
    slotIndex: number;
  }>;
}

const SCHEMA_VERSION = "1.0.0";

export class SvgTemplateExporterAdapter implements TemplateExporter {
  async exportSvgTemplate(spec: unknown): Promise<string> {
    const input = spec as TemplateSpecLike;
    const metadata = {
      templateSchemaVersion: SCHEMA_VERSION,
      typefaceId: input.typefaceId,
      templateCharacterPreset: input.templateCharacterPreset,
      templateCharacterSelection: input.templateCharacterSelection,
      unitsPerEm: input.unitsPerEm,
      grid: input.grid,
      glyphCount: input.glyphSlots.length,
    };

    const width = input.grid.cols * input.grid.cellWidth;
    const height = input.grid.rows * input.grid.cellHeight;

    const cells = input.glyphSlots
      .map((slot) => {
        const codepointAttr = slot.codePoint == null ? "" : ` data-codepoint=\"${slot.codePoint}\"`;
        return [
          `    <g id=\"cell-${slot.glyphId}\" data-role=\"glyph-cell\" data-glyph-id=\"${slot.glyphId}\" data-glyph-name=\"${slot.glyphName}\"${codepointAttr} data-kind=\"${slot.kind}\" data-slot-index=\"${slot.slotIndex}\">`,
          "      <g data-role=\"guides\"></g>",
          "      <g data-role=\"drawing\"></g>",
          "      <g data-role=\"label\"></g>",
          "    </g>",
        ].join("\n");
      })
      .join("\n");

    return [
      `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ${width} ${height}\">`,
      `  <metadata>${JSON.stringify(metadata)}</metadata>`,
      "  <g id=\"ctf-template-root\">",
      cells,
      "  </g>",
      "</svg>",
    ].join("\n");
  }
}
