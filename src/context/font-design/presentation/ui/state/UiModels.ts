import type { GlyphOutlineSnapshot, ImportIssue, ImportSummary } from "../../../domain/ports";

export type GlyphPreviewStatus = "ok" | "warning" | "error" | "empty";

export interface GlyphPreviewCardModel {
  glyphId: string;
  codePoint?: number;
  status: GlyphPreviewStatus;
  issues: readonly ImportIssue[];
  outline?: GlyphOutlineSnapshot;
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
}

export interface GlyphDetailModel {
  glyphId: string;
  codePoint?: number;
  status: GlyphPreviewStatus;
  issues: readonly ImportIssue[];
  outline?: GlyphOutlineSnapshot;
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
