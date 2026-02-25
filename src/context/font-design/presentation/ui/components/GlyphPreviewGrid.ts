import type { GlyphPreviewCardModel, GlyphPreviewStatus } from "../state/UiModels";

export interface GlyphPreviewGridFilter {
  status: GlyphPreviewStatus | "all";
  query?: string;
}

export function filterGlyphPreview(
  items: readonly GlyphPreviewCardModel[],
  filter: GlyphPreviewGridFilter,
): GlyphPreviewCardModel[] {
  const q = filter.query?.trim().toLowerCase();
  return items.filter((item) => {
    const statusOk = filter.status === "all" || item.status === filter.status;
    if (!statusOk) {
      return false;
    }

    if (!q) {
      return true;
    }

    const hex = item.codePoint == null ? "" : item.codePoint.toString(16).toLowerCase();
    return item.glyphId.toLowerCase().includes(q) || hex.includes(q);
  });
}
