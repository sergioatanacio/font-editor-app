import type { ExportFacade, ExportReadinessReport } from "../../../slices";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";

export class ValidacionExportacionScreen {
  private viewState: ViewState<ExportReadinessReport> = idleState();

  constructor(private readonly exportFacade: ExportFacade) {}

  getState(): ViewState<ExportReadinessReport> {
    return this.viewState;
  }

  async validate(projectId: string) {
    this.viewState = loadingState(this.viewState.data);
    const report = await this.exportFacade.validateReadiness(projectId);

    if (!report.isReady) {
      this.viewState = errorState(
        {
          code: "EXPORT_BLOCKED_BY_READINESS",
          message: "La validacion de exportacion contiene bloqueos.",
          recoverable: true,
        },
        report,
      );
      return this.viewState;
    }

    this.viewState = successState(report, report.warnings);
    return this.viewState;
  }
}
