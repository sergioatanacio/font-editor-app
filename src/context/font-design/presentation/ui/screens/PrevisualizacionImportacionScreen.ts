import type { ImportFacade } from "../../../application/facades/ImportFacade";
import { filterGlyphPreview } from "../components/GlyphPreviewGrid";
import { toGlyphDetailPanelModel } from "../components/GlyphDetailPanel";
import { createGlyphStatusFilterBar } from "../components/GlyphStatusFilterBar";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";
import type { GlyphDetailModel, ImportPreviewViewData } from "../state/UiModels";

export class PrevisualizacionImportacionScreen {
  private viewState: ViewState<ImportPreviewViewData> = idleState();
  private selectedGlyph: GlyphDetailModel | null = null;

  constructor(private readonly importFacade: ImportFacade) {}

  bindPreview(data: ImportPreviewViewData): ViewState<ImportPreviewViewData> {
    this.viewState = successState(data);
    return this.viewState;
  }

  getState(): ViewState<ImportPreviewViewData> {
    return this.viewState;
  }

  selectGlyph(glyphId: string): ReturnType<typeof toGlyphDetailPanelModel> | null {
    const item = this.viewState.data?.glyphPreview.find((x) => x.glyphId === glyphId);
    if (!item) {
      this.selectedGlyph = null;
      return null;
    }

    this.selectedGlyph = {
      glyphId: item.glyphId,
      codePoint: item.codePoint,
      status: item.status,
      issues: item.issues,
      outline: item.outline,
      bounds: item.bounds,
    };

    return toGlyphDetailPanelModel(this.selectedGlyph);
  }

  filter(status: "all" | "ok" | "warning" | "error" | "empty", query?: string): ViewState<ImportPreviewViewData> {
    if (!this.viewState.data) {
      return this.viewState;
    }

    const filterBar = createGlyphStatusFilterBar(status);
    const filtered = filterGlyphPreview(this.viewState.data.glyphPreview, {
      status: filterBar.active,
      query,
    });

    this.viewState = successState({
      ...this.viewState.data,
      glyphPreview: filtered,
    });

    return this.viewState;
  }

  async confirm(projectId: string) {
    const currentPreviewId = this.viewState.data?.previewId?.trim() ?? "";
    if (!currentPreviewId) {
      this.viewState = errorState({
        code: "NO_PREVIEW_LOADED",
        message: "Primero ejecuta 'Previsualizar importacion' desde ImportacionSvg.",
        recoverable: true,
      }, this.viewState.data);
      return this.viewState;
    }

    this.viewState = loadingState(this.viewState.data);
    const result = await this.importFacade.commitImport({ projectId, previewId: currentPreviewId });

    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      }, this.viewState.data);
      return this.viewState;
    }

    this.viewState = successState(this.viewState.data ?? {
      previewId: currentPreviewId,
      glyphPreview: [],
      summary: { total: 0, ok: 0, warning: 0, error: 0, empty: 0, blockingCount: 0 },
      issues: [],
      isBlocking: false,
      expiresAt: "",
    }, [{ code: "IMPORT_APPLIED", message: `Importacion aplicada (${result.value.importedCount} glifos).` }]);

    return this.viewState;
  }
}
