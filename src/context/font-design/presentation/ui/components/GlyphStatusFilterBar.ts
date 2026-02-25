import type { GlyphPreviewStatus } from "../state/UiModels";

export interface GlyphStatusFilterBarModel {
  active: GlyphPreviewStatus | "all";
  allowed: readonly (GlyphPreviewStatus | "all")[];
}

export function createGlyphStatusFilterBar(active: GlyphPreviewStatus | "all"): GlyphStatusFilterBarModel {
  return {
    active,
    allowed: ["all", "ok", "warning", "error", "empty"],
  };
}
