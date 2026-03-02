import { describe, expect, it } from "vitest";
import { SvgTemplateExporterAdapter } from "./SvgTemplateExporterAdapter";

describe("SvgTemplateExporterAdapter", () => {
  it("genera guias visibles por celda", async () => {
    const adapter = new SvgTemplateExporterAdapter();
    const svg = await adapter.exportSvgTemplate({
      typefaceId: "tf-test",
      templateCharacterPreset: "latam-alnum",
      templateCharacterSelection: { includeLatamAlnum: true, includeCodeChars: false },
      unitsPerEm: 1000,
      metrics: { ascender: 800, descender: -200 },
      grid: { cols: 2, rows: 1, cellWidth: 120, cellHeight: 120, padding: 12 },
      glyphSlots: [
        { glyphId: "A", glyphName: "A", codePoint: 65, kind: "base", slotIndex: 0 },
        { glyphId: "space", glyphName: "space", codePoint: 32, kind: "space", slotIndex: 1 },
      ],
    });

    expect(svg).toContain('id="ctf-template-root"');
    expect(svg).toContain('"templateSchemaVersion":"1.1.0"');
    expect(svg).toContain('data-role="guides"');
    expect(svg).toContain('<rect x="0" y="0" width="120" height="120"');
    expect(svg).toContain('data-guide="baseline"');
    expect(svg).toContain('data-guide="x-height"');
    expect(svg).toContain('data-guide="cap-height"');
    expect(svg).toContain('data-guide="ascender"');
    expect(svg).toContain('data-guide="descender"');
    expect(svg).toContain('data-guide="lsb"');
    expect(svg).toContain('stroke="#3F6B93" stroke-width="0.7"');
    expect(svg).toContain('data-guide="center"');
    expect(svg).toContain('stroke="#AEB9C6" stroke-width="0.5" stroke-dasharray="2 3"');
    expect(svg).toContain('data-guide="advance"');
    expect(svg).toContain('stroke-dasharray="3 2"');
    expect(svg).toContain('data-role="drawing"');
    expect(svg).toContain('data-role="label"');
    expect(svg).toContain('<text x="12" y="10"');
  });

  it("desacopla center de advance cuando quedan casi superpuestos", async () => {
    const adapter = new SvgTemplateExporterAdapter();
    const svg = await adapter.exportSvgTemplate({
      typefaceId: "tf-test",
      templateCharacterPreset: "latam-alnum",
      templateCharacterSelection: { includeLatamAlnum: true, includeCodeChars: false },
      unitsPerEm: 1000,
      metrics: { ascender: 605, descender: -200 },
      grid: { cols: 1, rows: 1, cellWidth: 120, cellHeight: 120, padding: 12 },
      glyphSlots: [
        { glyphId: "A", glyphName: "A", codePoint: 65, kind: "base", slotIndex: 0 },
      ],
    });

    const centerMatch = svg.match(/data-guide="center"[^>]*x1="([^"]+)"/);
    const advanceMatch = svg.match(/data-guide="advance"[^>]*x1="([^"]+)"/);
    expect(centerMatch?.[1]).toBeTruthy();
    expect(advanceMatch?.[1]).toBeTruthy();
    expect(Number(centerMatch![1])).not.toBe(Number(advanceMatch![1]));
  });
});
