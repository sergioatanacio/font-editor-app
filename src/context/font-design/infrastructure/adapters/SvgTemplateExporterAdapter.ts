import type { TemplateExporter } from "../../domain/ports";

interface TemplateSpecLike {
  typefaceId: string;
  templateCharacterPreset: string;
  templateCharacterSelection: {
    includeLatamAlnum: boolean;
    includeCodeChars: boolean;
  };
  unitsPerEm: number;
  metrics: {
    ascender: number;
    descender: number;
  };
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

const SCHEMA_VERSION = "1.1.0";

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class SvgTemplateExporterAdapter implements TemplateExporter {
  async exportSvgTemplate(spec: unknown): Promise<string> {
    const input = spec as TemplateSpecLike;
    const capHeight = Math.round(input.metrics.ascender * 0.875);
    const xHeight = Math.round(capHeight * 0.72);
    const defaultAdvanceWidth = Math.round(input.unitsPerEm * 0.6);
    const metadata = {
      templateSchemaVersion: SCHEMA_VERSION,
      typefaceId: input.typefaceId,
      templateCharacterPreset: input.templateCharacterPreset,
      templateCharacterSelection: input.templateCharacterSelection,
      unitsPerEm: input.unitsPerEm,
      metrics: {
        ascender: input.metrics.ascender,
        descender: input.metrics.descender,
        capHeight,
        xHeight,
        baseline: 0,
        defaultAdvanceWidth,
      },
      grid: input.grid,
      glyphCount: input.glyphSlots.length,
    };

    const width = input.grid.cols * input.grid.cellWidth;
    const height = input.grid.rows * input.grid.cellHeight;

    const cells = input.glyphSlots
      .map((slot) => {
        const codepointAttr = slot.codePoint == null ? "" : ` data-codepoint=\"${slot.codePoint}\"`;
        const { x, y } = slotPosition(slot.slotIndex, input.grid.cols, input.grid.cellWidth, input.grid.cellHeight);
        const innerX = input.grid.padding;
        const innerY = input.grid.padding;
        const innerWidth = input.grid.cellWidth - (2 * input.grid.padding);
        const innerHeight = input.grid.cellHeight - (2 * input.grid.padding);
        const metricSpan = input.metrics.ascender - input.metrics.descender;
        const scale = innerHeight / metricSpan;
        const fontToCellY = (fontY: number) => round2(innerY + (input.metrics.ascender - fontY) * scale);
        const fontToCellX = (fontX: number) => round2(innerX + (fontX * scale));
        const yAscender = fontToCellY(input.metrics.ascender);
        const yCap = fontToCellY(capHeight);
        const yXHeight = fontToCellY(xHeight);
        const yBaseline = fontToCellY(0);
        const yDescender = fontToCellY(input.metrics.descender);
        const xStart = fontToCellX(0);
        const xAdvance = clamp(fontToCellX(defaultAdvanceWidth), innerX, innerX + innerWidth);
        const label = slot.codePoint == null
          ? slot.glyphName
          : `${slot.glyphName} (U+${slot.codePoint.toString(16).toUpperCase().padStart(4, "0")})`;

        return [
          `    <g id=\"cell-${esc(slot.glyphId)}\" data-role=\"glyph-cell\" data-glyph-id=\"${esc(slot.glyphId)}\" data-glyph-name=\"${esc(slot.glyphName)}\"${codepointAttr} data-kind=\"${slot.kind}\" data-slot-index=\"${slot.slotIndex}\" transform=\"translate(${x},${y})\">`,
          "      <g data-role=\"guides\">",
          `        <rect x=\"0\" y=\"0\" width=\"${input.grid.cellWidth}\" height=\"${input.grid.cellHeight}\" fill=\"none\" stroke=\"#C4C4C4\" stroke-width=\"0.8\"/>`,
          `        <rect x=\"${innerX}\" y=\"${innerY}\" width=\"${innerWidth}\" height=\"${innerHeight}\" fill=\"none\" stroke=\"#DCDCDC\" stroke-dasharray=\"2 2\" stroke-width=\"0.6\"/>`,
          `        <line data-role=\"guide\" data-guide=\"ascender\" x1=\"${innerX}\" y1=\"${yAscender}\" x2=\"${innerX + innerWidth}\" y2=\"${yAscender}\" stroke=\"#A2A2A2\" stroke-width=\"0.6\"/>`,
          `        <line data-role=\"guide\" data-guide=\"cap-height\" x1=\"${innerX}\" y1=\"${yCap}\" x2=\"${innerX + innerWidth}\" y2=\"${yCap}\" stroke=\"#9EA7B3\" stroke-width=\"0.6\" stroke-dasharray=\"2 2\"/>`,
          `        <line data-role=\"guide\" data-guide=\"x-height\" x1=\"${innerX}\" y1=\"${yXHeight}\" x2=\"${innerX + innerWidth}\" y2=\"${yXHeight}\" stroke=\"#86A8C6\" stroke-width=\"0.6\" stroke-dasharray=\"2 2\"/>`,
          `        <line data-role=\"guide\" data-guide=\"baseline\" x1=\"${innerX}\" y1=\"${yBaseline}\" x2=\"${innerX + innerWidth}\" y2=\"${yBaseline}\" stroke=\"#2F8F6A\" stroke-width=\"0.9\"/>`,
          `        <line data-role=\"guide\" data-guide=\"descender\" x1=\"${innerX}\" y1=\"${yDescender}\" x2=\"${innerX + innerWidth}\" y2=\"${yDescender}\" stroke=\"#A2A2A2\" stroke-width=\"0.6\"/>`,
          `        <line data-role=\"guide\" data-guide=\"lsb\" x1=\"${xStart}\" y1=\"${innerY}\" x2=\"${xStart}\" y2=\"${innerY + innerHeight}\" stroke=\"#5D7A99\" stroke-width=\"0.6\"/>`,
          `        <line data-role=\"guide\" data-guide=\"advance\" x1=\"${xAdvance}\" y1=\"${innerY}\" x2=\"${xAdvance}\" y2=\"${innerY + innerHeight}\" stroke=\"#5D7A99\" stroke-width=\"0.6\" stroke-dasharray=\"2 2\"/>`,
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
