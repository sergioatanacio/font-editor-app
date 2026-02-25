import type { GlyphPreviewCardModel, GlyphPreviewStatus } from "../state/UiModels";

export interface GlyphPreviewCardProps {
  glyphId: string;
  codePoint?: number;
  status: GlyphPreviewStatus;
  issuesCount: number;
}

export function toGlyphPreviewCardProps(model: GlyphPreviewCardModel): GlyphPreviewCardProps {
  return {
    glyphId: model.glyphId,
    codePoint: model.codePoint,
    status: model.status,
    issuesCount: model.issues.length,
  };
}
