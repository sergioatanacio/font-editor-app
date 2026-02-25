import type { ImportFacade } from "../../../application/facades/ImportFacade";
import { createGlyphStatusFilterBar } from "../components/GlyphStatusFilterBar";
import { filterGlyphPreview } from "../components/GlyphPreviewGrid";
import { toImportSummaryPanelModel } from "../components/ImportSummaryPanel";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";
import type { ImportPreviewViewData } from "../state/UiModels";

export class ImportacionSvgScreen {
  private viewState: ViewState<ImportPreviewViewData> = idleState();

  constructor(private readonly importFacade: ImportFacade) {}

  getState(): ViewState<ImportPreviewViewData> {
    return this.viewState;
  }

  getFsmState() {
    return this.importFacade.getState();
  }

  async preview(input: { projectId: string; filename: string; svgContent: string; mapping: unknown }): Promise<ViewState<ImportPreviewViewData>> {
    this.viewState = loadingState(this.viewState.data);

    const result = await this.importFacade.previewImport(input);
    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      });
      return this.viewState;
    }

    const filterBar = createGlyphStatusFilterBar("all");
    const filtered = filterGlyphPreview(result.value.glyphPreview, { status: filterBar.active });
    const summaryModel = toImportSummaryPanelModel(result.value.summary);

    this.viewState = successState({
      previewId: result.value.previewId,
      glyphPreview: filtered,
      summary: result.value.summary,
      issues: result.value.issues,
      isBlocking: result.value.isBlocking,
      expiresAt: result.value.expiresAt,
    }, summaryModel.isBlocking ? [{ code: "IMPORT_BLOCKING_ISSUES", message: "El preview contiene errores bloqueantes." }] : undefined);

    return this.viewState;
  }

  cancelImport() {
    this.importFacade.cancel("user-cancelled");
    this.viewState = idleState();
    return this.viewState;
  }
}
