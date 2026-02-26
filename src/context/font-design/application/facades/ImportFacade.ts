import { importFsmInitialState, importFsmTransition, type ImportFsmState } from "../fsm/import-preview/importPreviewFsm";
import type { AppError } from "../../shared/errors/AppError";
import { CommitTemplateImportPreviewUseCase, PreviewTemplateImportUseCase } from "../use-cases";

function appError(code: string, message: string): AppError {
  return {
    code,
    message,
    recoverable: true,
    layer: "application",
    severity: "error",
  };
}

export class ImportFacade {
  private state: ImportFsmState = importFsmInitialState;

  constructor(
    private readonly previewUseCase: PreviewTemplateImportUseCase,
    private readonly commitUseCase: CommitTemplateImportPreviewUseCase,
  ) {}

  getState(): ImportFsmState {
    return this.state;
  }

  reset(): ImportFsmState {
    this.state = importFsmTransition(this.state, { type: "RESET" });
    return this.state;
  }

  cancel(reason?: string): ImportFsmState {
    this.state = importFsmTransition(this.state, { type: "CANCEL_IMPORT", reason });
    return this.state;
  }

  async previewImport(input: { projectId: string; filename: string; svgContent: string; mapping: unknown }) {
    this.state = importFsmTransition(this.state, { type: "SELECT_FILE", filename: input.filename });
    this.state = importFsmTransition(this.state, { type: "FILE_LOADED", svgContent: input.svgContent });
    this.state = importFsmTransition(this.state, { type: "PARSE_OK" });
    this.state = importFsmTransition(this.state, { type: "MAP_OK" });

    const result = await this.previewUseCase.execute({
      projectId: input.projectId,
      svgContent: input.svgContent,
      mapping: input.mapping,
    });

    if (!result.ok) {
      this.state = importFsmTransition(this.state, {
        type: "PARSE_FAIL",
        issues: [result.error.code],
      });
      return result;
    }

    const event = result.value.isBlocking
      ? {
          type: "VALIDATION_FAIL" as const,
          previewId: result.value.previewId,
          summary: result.value.summary,
          issues: result.value.issues.map((x) => x.code),
          expiresAt: result.value.expiresAt,
          isBlocking: true as const,
        }
      : {
          type: "VALIDATION_OK" as const,
          previewId: result.value.previewId,
          summary: result.value.summary,
          expiresAt: result.value.expiresAt,
          isBlocking: false as const,
        };

    this.state = importFsmTransition(this.state, event);
    return result;
  }

  async commitImport(input: { projectId: string; previewId: string }) {
    const incomingPreviewId = input.previewId?.trim() ?? "";
    if (!incomingPreviewId) {
      return {
        ok: false as const,
        error: appError("NO_PREVIEW_LOADED", "Primero ejecuta 'Previsualizar importacion' desde ImportacionSvg."),
      };
    }

    if (this.state.name !== "previewReady") {
      return {
        ok: false as const,
        error: appError("PREVIEW_NOT_READY", "No hay un preview listo para aplicar."),
      };
    }

    if ((this.state.previewId ?? "").trim() !== incomingPreviewId) {
      return {
        ok: false as const,
        error: appError("PREVIEW_ID_MISMATCH", "El preview seleccionado no coincide con el estado actual."),
      };
    }

    this.state = importFsmTransition(this.state, { type: "APPLY_REQUESTED" });

    if (this.state.name === "error") {
      return {
        ok: false as const,
        error: appError("IMPORT_BLOCKED_BY_VALIDATION", "No se puede aplicar un preview bloqueante."),
      };
    }

    const result = await this.commitUseCase.execute(input);
    if (!result.ok) {
      this.state = importFsmTransition(this.state, {
        type: "APPLY_FAIL",
        issues: [result.error.code],
      });
      return result;
    }

    this.state = importFsmTransition(this.state, { type: "APPLY_OK" });
    return result;
  }
}
