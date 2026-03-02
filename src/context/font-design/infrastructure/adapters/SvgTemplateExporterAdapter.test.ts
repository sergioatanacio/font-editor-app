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
    expect(svg).toContain('data-guide="advance"');
    expect(svg).toContain('data-role="drawing"');
    expect(svg).toContain('data-role="label"');
    expect(svg).toContain('<text x="12" y="10"');
  });
});
