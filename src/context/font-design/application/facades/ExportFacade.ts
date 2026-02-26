import { exportFsmInitialState, exportFsmTransition, type ExportFsmState } from "../fsm/export-ttf/exportTtfFsm";
import type { AppError } from "../../shared/errors/AppError";
import { ExportTypefaceToTtfUseCase, ValidateTypefaceForExportUseCase } from "../use-cases";

function appError(code: string, message: string): AppError {
  return {
    code,
    message,
    recoverable: true,
    layer: "application",
    severity: "error",
  };
}

export interface ExportReadinessReport {
  isReady: boolean;
  errors: Array<{ code: string; message: string; glyphId?: string }>;
  warnings: Array<{ code: string; message: string; glyphId?: string }>;
}

export class ExportFacade {
  private state: ExportFsmState = exportFsmInitialState;

  constructor(
    private readonly exportUseCase: ExportTypefaceToTtfUseCase,
    private readonly validateReadinessUseCase: ValidateTypefaceForExportUseCase,
  ) {}

  getState(): ExportFsmState {
    return this.state;
  }

  reset(): ExportFsmState {
    this.state = exportFsmTransition(this.state, { type: "RESET" });
    return this.state;
  }

  async validateReadiness(projectId: string): Promise<ExportReadinessReport> {
    const result = await this.validateReadinessUseCase.execute({ projectId });
    if (!result.ok) {
      return {
        isReady: false,
        errors: [{ code: result.error.code, message: result.error.message }],
        warnings: [],
      };
    }

    return result.value;
  }

  async exportTtf(input: { projectId: string; filename: string }) {
    this.state = exportFsmTransition(this.state, { type: "EXPORT_REQUESTED" });

    const readiness = await this.validateReadiness(input.projectId);
    if (!readiness.isReady) {
      this.state = exportFsmTransition(this.state, {
        type: "VALID_FAIL",
        issues: readiness.errors.map((x) => x.code),
      });
      return {
        ok: false as const,
        error: appError("EXPORT_BLOCKED_BY_READINESS", "La fuente no cumple readiness de exportacion."),
        report: readiness,
      };
    }

    this.state = exportFsmTransition(this.state, { type: "VALID_OK" });

    const result = await this.exportUseCase.execute(input);
    if (!result.ok) {
      this.state = exportFsmTransition(this.state, {
        type: "EXPORT_FAIL",
        issues: [result.error.code],
      });
      return result;
    }

    this.state = exportFsmTransition(this.state, {
      type: "EXPORT_OK",
      byteLength: result.value.byteLength,
    });
    this.state = exportFsmTransition(this.state, { type: "SAVE_OK" });
    return result;
  }
}
