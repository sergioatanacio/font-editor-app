import type { ImportIssue, ImportSummary } from "../../../domain/ports";

export type GlyphPreviewStatus = "ok" | "warning" | "error" | "empty";

export interface GlyphPreviewCardModel {
  glyphId: string;
  codePoint?: number;
  status: GlyphPreviewStatus;
  issues: readonly ImportIssue[];
}

export interface GlyphDetailModel {
  glyphId: string;
  codePoint?: number;
  status: GlyphPreviewStatus;
  issues: readonly ImportIssue[];
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
}

export interface ImportPreviewViewData {
  previewId: string;
  summary: ImportSummary;
  issues: readonly ImportIssue[];
  glyphPreview: readonly GlyphPreviewCardModel[];
  isBlocking: boolean;
  expiresAt: string;
}
