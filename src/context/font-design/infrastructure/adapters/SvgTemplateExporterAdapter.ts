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

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slotPosition(slotIndex: number, cols: number, cellWidth: number, cellHeight: number): { x: number; y: number } {
  const row = Math.floor(slotIndex / cols);
  const col = slotIndex % cols;
  return {
    x: col * cellWidth,
    y: row * cellHeight,
  };
}

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
        const { x, y } = slotPosition(slot.slotIndex, input.grid.cols, input.grid.cellWidth, input.grid.cellHeight);
        const usable = input.grid.cellHeight - (2 * input.grid.padding);
        const label = slot.codePoint == null
          ? slot.glyphName
          : `${slot.glyphName} (U+${slot.codePoint.toString(16).toUpperCase().padStart(4, "0")})`;

        return [
          `    <g id=\"cell-${esc(slot.glyphId)}\" data-role=\"glyph-cell\" data-glyph-id=\"${esc(slot.glyphId)}\" data-glyph-name=\"${esc(slot.glyphName)}\"${codepointAttr} data-kind=\"${slot.kind}\" data-slot-index=\"${slot.slotIndex}\" transform=\"translate(${x},${y})\">`,
          "      <g data-role=\"guides\">",
          `        <rect x=\"0\" y=\"0\" width=\"${input.grid.cellWidth}\" height=\"${input.grid.cellHeight}\" fill=\"none\" stroke=\"#C4C4C4\" stroke-width=\"0.8\"/>`,
          `        <rect x=\"${input.grid.padding}\" y=\"${input.grid.padding}\" width=\"${input.grid.cellWidth - (2 * input.grid.padding)}\" height=\"${usable}\" fill=\"none\" stroke=\"#DCDCDC\" stroke-dasharray=\"2 2\" stroke-width=\"0.6\"/>`,
          `        <line x1=\"${input.grid.padding}\" y1=\"${input.grid.cellHeight - input.grid.padding}\" x2=\"${input.grid.cellWidth - input.grid.padding}\" y2=\"${input.grid.cellHeight - input.grid.padding}\" stroke=\"#2F8F6A\" stroke-width=\"0.9\"/>`,
          "      </g>",
          "      <g data-role=\"drawing\"></g>",
          "      <g data-role=\"label\">",
          `        <text x=\"${input.grid.padding}\" y=\"${input.grid.padding - 2}\" font-size=\"7\" font-family=\"monospace\" fill=\"#4A4A4A\">${esc(label)}</text>`,
          "      </g>",
          "    </g>",
        ].join("\n");
      })
      .join("\n");

    return [
      `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ${width} ${height}\" width=\"${width}\" height=\"${height}\">`,
      `  <metadata>${JSON.stringify(metadata)}</metadata>`,
      "  <rect x=\"0\" y=\"0\" width=\"100%\" height=\"100%\" fill=\"#FFFFFF\"/>",
      "  <g id=\"ctf-template-root\">",
      cells,
      "  </g>",
      "</svg>",
    ].join("\n");
  }
}
