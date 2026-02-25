import type { GlyphDetailModel } from "../state/UiModels";

export interface GlyphDetailPanelModel {
  title: string;
  glyphId: string;
  codePoint?: number;
  issueCodes: readonly string[];
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
}

export function toGlyphDetailPanelModel(detail: GlyphDetailModel): GlyphDetailPanelModel {
  return {
    title: `Glyph ${detail.glyphId}`,
    glyphId: detail.glyphId,
    codePoint: detail.codePoint,
    issueCodes: detail.issues.map((x) => x.code),
    bounds: detail.bounds,
  };
}
