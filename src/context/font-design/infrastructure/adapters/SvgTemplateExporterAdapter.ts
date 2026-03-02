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
const LEGEND_HEIGHT = 168;

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

function labelForSlot(slot: {
  glyphName: string;
  codePoint?: number;
}): string {
  if (slot.codePoint == null) {
    return slot.glyphName;
  }

  const codeHex = `U+${slot.codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
  if (slot.codePoint === 0x20) {
    return `space (${codeHex})`;
  }

  const printable = slot.codePoint >= 0x21 && slot.codePoint <= 0x10ffff;
  if (!printable) {
    return `${slot.glyphName} (${codeHex})`;
  }

  return `${String.fromCodePoint(slot.codePoint)} (${codeHex})`;
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
    const gridHeight = input.grid.rows * input.grid.cellHeight;
    const height = gridHeight + LEGEND_HEIGHT;
    const metricSpan = input.metrics.ascender - input.metrics.descender;
    const sampleChars = ["A", "a", "K", "k", "l", "j", "g", "x"];
    const sampleSize = 30;
    const sampleGap = 8;
    const samplePadding = 3;
    const sampleInner = sampleSize - (2 * samplePadding);
    const sampleScale = sampleInner / metricSpan;
    const sampleBaselineY = round2(samplePadding + (input.metrics.ascender * sampleScale));
    const sampleCapY = round2(samplePadding + ((input.metrics.ascender - capHeight) * sampleScale));
    const sampleXHeightY = round2(samplePadding + ((input.metrics.ascender - xHeight) * sampleScale));
    const sampleDescY = round2(samplePadding + ((input.metrics.ascender - input.metrics.descender) * sampleScale));
    const sampleLsbX = samplePadding;
    const sampleAdvanceX = clamp(
      round2(samplePadding + (defaultAdvanceWidth * sampleScale)),
      samplePadding,
      samplePadding + sampleInner,
    );
    const sampleCenterRawX = round2(samplePadding + (sampleInner / 2));
    const sampleCenterX = Math.abs(sampleCenterRawX - sampleAdvanceX) < 1 ? round2(sampleCenterRawX + 1.5) : sampleCenterRawX;
    const sampleFontSize = round2(Math.max(8, Math.min(16, capHeight * sampleScale * 0.95)));
    const sampleCells = sampleChars
      .map((char, index) => {
        const x = index * (sampleSize + sampleGap);
        return [
          `    <g id=\"legend-sample-${esc(char)}\" transform=\"translate(${x},0)\">`,
          `      <rect x=\"0\" y=\"0\" width=\"${sampleSize}\" height=\"${sampleSize}\" fill=\"none\" stroke=\"#BFC6CD\" stroke-width=\"0.6\"/>`,
          `      <rect x=\"${samplePadding}\" y=\"${samplePadding}\" width=\"${sampleInner}\" height=\"${sampleInner}\" fill=\"none\" stroke=\"#DCDCDC\" stroke-dasharray=\"2 2\" stroke-width=\"0.5\"/>`,
          `      <line x1=\"${samplePadding}\" y1=\"${sampleCapY}\" x2=\"${samplePadding + sampleInner}\" y2=\"${sampleCapY}\" stroke=\"#9EA7B3\" stroke-width=\"0.5\" stroke-dasharray=\"2 2\"/>`,
          `      <line x1=\"${samplePadding}\" y1=\"${sampleXHeightY}\" x2=\"${samplePadding + sampleInner}\" y2=\"${sampleXHeightY}\" stroke=\"#86A8C6\" stroke-width=\"0.5\" stroke-dasharray=\"2 2\"/>`,
          `      <line x1=\"${samplePadding}\" y1=\"${sampleBaselineY}\" x2=\"${samplePadding + sampleInner}\" y2=\"${sampleBaselineY}\" stroke=\"#2F8F6A\" stroke-width=\"0.7\"/>`,
          `      <line x1=\"${samplePadding}\" y1=\"${sampleDescY}\" x2=\"${samplePadding + sampleInner}\" y2=\"${sampleDescY}\" stroke=\"#A2A2A2\" stroke-width=\"0.5\"/>`,
          `      <line x1=\"${sampleLsbX}\" y1=\"${samplePadding}\" x2=\"${sampleLsbX}\" y2=\"${samplePadding + sampleInner}\" stroke=\"#3F6B93\" stroke-width=\"0.6\"/>`,
          `      <line x1=\"${sampleCenterX}\" y1=\"${samplePadding}\" x2=\"${sampleCenterX}\" y2=\"${samplePadding + sampleInner}\" stroke=\"#AEB9C6\" stroke-width=\"0.4\" stroke-dasharray=\"2 3\"/>`,
          `      <line x1=\"${sampleAdvanceX}\" y1=\"${samplePadding}\" x2=\"${sampleAdvanceX}\" y2=\"${samplePadding + sampleInner}\" stroke=\"#3F6B93\" stroke-width=\"0.6\" stroke-dasharray=\"3 2\"/>`,
          `      <text x=\"${round2(sampleLsbX + 1)}\" y=\"${sampleBaselineY}\" font-size=\"${sampleFontSize}\" font-family=\"sans-serif\" fill=\"#34343B\">${esc(char)}</text>`,
          "    </g>",
        ].join("\n");
      })
      .join("\n");

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
        const xCenterRaw = round2(innerX + (innerWidth / 2));
        const xCenter = Math.abs(xCenterRaw - xAdvance) < 1 ? round2(xCenterRaw + 2) : xCenterRaw;
        const label = labelForSlot(slot);

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
          `        <line data-role=\"guide\" data-guide=\"lsb\" x1=\"${xStart}\" y1=\"${innerY}\" x2=\"${xStart}\" y2=\"${innerY + innerHeight}\" stroke=\"#3F6B93\" stroke-width=\"0.7\"/>`,
          `        <line data-role=\"guide\" data-guide=\"center\" x1=\"${xCenter}\" y1=\"${innerY}\" x2=\"${xCenter}\" y2=\"${innerY + innerHeight}\" stroke=\"#AEB9C6\" stroke-width=\"0.5\" stroke-dasharray=\"2 3\"/>`,
          `        <line data-role=\"guide\" data-guide=\"advance\" x1=\"${xAdvance}\" y1=\"${innerY}\" x2=\"${xAdvance}\" y2=\"${innerY + innerHeight}\" stroke=\"#3F6B93\" stroke-width=\"0.7\" stroke-dasharray=\"3 2\"/>`,
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
      `  <g id=\"ctf-template-legend\" transform=\"translate(12,${gridHeight + 10})\">`,
      "    <text x=\"0\" y=\"10\" font-size=\"9\" font-family=\"monospace\" fill=\"#2A2A2A\">LEYENDA DE DIBUJO</text>",
      "    <line x1=\"0\" y1=\"24\" x2=\"42\" y2=\"24\" stroke=\"#2F8F6A\" stroke-width=\"1\"/>",
      "    <text x=\"48\" y=\"27\" font-size=\"8\" font-family=\"monospace\" fill=\"#3A3A3A\">baseline: apoyo principal del glifo</text>",
      "    <line x1=\"0\" y1=\"39\" x2=\"42\" y2=\"39\" stroke=\"#3F6B93\" stroke-width=\"1\"/>",
      "    <text x=\"48\" y=\"42\" font-size=\"8\" font-family=\"monospace\" fill=\"#3A3A3A\">lsb: inicio recomendado del trazo</text>",
      "    <line x1=\"0\" y1=\"54\" x2=\"42\" y2=\"54\" stroke=\"#3F6B93\" stroke-width=\"1\" stroke-dasharray=\"3 2\"/>",
      "    <text x=\"48\" y=\"57\" font-size=\"8\" font-family=\"monospace\" fill=\"#3A3A3A\">advance: ancho de avance (espaciado)</text>",
      "    <text x=\"0\" y=\"72\" font-size=\"8\" font-family=\"monospace\" fill=\"#5A5A5A\">Dibuja entre LSB y advance; puede sobresalir si es necesario (g, q, acentos).</text>",
      "    <text x=\"0\" y=\"88\" font-size=\"8\" font-family=\"monospace\" fill=\"#3A3A3A\">Muestras de colocacion sugerida:</text>",
      "    <g id=\"ctf-template-legend-samples\" transform=\"translate(0,96)\">",
      sampleCells,
      "    </g>",
      "  </g>",
      "</svg>",
    ].join("\n");
  }
}
