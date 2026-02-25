import type { GlyphVectorImporter, ImportedGlyphBatch } from "../../domain/ports";

const SIMPLE_OUTLINE = {
  contours: [
    [
      { type: "M" as const, values: [0, 0] },
      { type: "L" as const, values: [50, 100] },
      { type: "L" as const, values: [100, 0] },
      { type: "Z" as const, values: [] },
    ],
  ],
};

export class StubGlyphVectorImporter implements GlyphVectorImporter {
  async importFromSvg(_input: string, mapping: unknown): Promise<ImportedGlyphBatch> {
    const mappedGlyphId = this.resolveGlyphId(mapping);

    return {
      items: [
        {
          glyphId: mappedGlyphId,
          outline: SIMPLE_OUTLINE,
          issues: [],
        },
      ],
      globalIssues: [],
      isBlocking: false,
      preview: [
        {
          glyphId: mappedGlyphId,
          status: "ok",
          issues: [],
        },
      ],
    };
  }

  private resolveGlyphId(mapping: unknown): string {
    if (!mapping || typeof mapping !== "object") {
      return "A";
    }

    const candidate = mapping as { defaultGlyphId?: unknown; glyphId?: unknown };
    if (typeof candidate.defaultGlyphId === "string" && candidate.defaultGlyphId.trim()) {
      return candidate.defaultGlyphId;
    }

    if (typeof candidate.glyphId === "string" && candidate.glyphId.trim()) {
      return candidate.glyphId;
    }

    return "A";
  }
}
