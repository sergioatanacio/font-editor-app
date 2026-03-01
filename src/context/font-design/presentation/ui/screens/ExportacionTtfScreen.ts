import type { ExportFacade } from "../../../slices";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";

export interface ExportacionTtfData {
  filename: string;
  byteLength: number;
  report?: {
    isReady: boolean;
    errors: Array<{ code: string; message: string; glyphId?: string }>;
    warnings: Array<{ code: string; message: string; glyphId?: string }>;
  };
}

export class ExportacionTtfScreen {
  private viewState: ViewState<ExportacionTtfData> = idleState();

  constructor(private readonly exportFacade: ExportFacade) {}

  getState(): ViewState<ExportacionTtfData> {
    return this.viewState;
  }

  getFsmState() {
    return this.exportFacade.getState();
  }

  async export(projectId: string, filename: string) {
    this.viewState = loadingState(this.viewState.data);

    const result = await this.exportFacade.exportTtf({ projectId, filename });
    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      }, "report" in result ? { filename, byteLength: 0, report: result.report } : undefined);
      return this.viewState;
    }

    this.viewState = successState({
      filename: result.value.filename,
      byteLength: result.value.byteLength,
    }, result.value.warnings.map((x) => ({ code: x.code, message: x.message })));

    return this.viewState;
  }
}
