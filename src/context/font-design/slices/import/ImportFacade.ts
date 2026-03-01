import { importFsmInitialState, importFsmTransition, type ImportFsmState } from "./importPreviewFsm";
import type { AppError } from "../../shared/errors/AppError";
import { CommitTemplateImportPreviewUseCase } from "./CommitTemplateImportPreviewUseCase";
import { PreviewTemplateImportUseCase } from "./PreviewTemplateImportUseCase";
import type { DomainEventBus } from "../../domain/ports";
import { DomainEventNames } from "../../domain/ports";

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
  private static readonly noopEventBus: DomainEventBus = {
    async publish() {},
    async publishAll() {},
    subscribe() {
      return () => {};
    },
  };

  constructor(
    private readonly previewUseCase: PreviewTemplateImportUseCase,
    private readonly commitUseCase: CommitTemplateImportPreviewUseCase,
    private readonly eventBus: DomainEventBus = ImportFacade.noopEventBus,
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
    console.info("[IMPORT_TRACE][FACADE] previewImport:start", {
      state: this.state.name,
      projectId: input.projectId,
      filename: input.filename,
      svgLength: input.svgContent.length,
      hasTemplateRootMarker: input.svgContent.includes("ctf-template-root"),
    });
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
      console.error("[IMPORT_TRACE][FACADE] previewImport:error", {
        state: this.state.name,
        code: result.error.code,
        message: result.error.message,
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
    try {
      await this.eventBus.publish({
        name: DomainEventNames.ImportPreviewGenerated,
        occurredAt: new Date().toISOString(),
        version: 1,
        aggregateId: input.projectId,
        payload: {
          projectId: input.projectId,
          previewId: result.value.previewId,
          summary: result.value.summary,
          isBlocking: result.value.isBlocking,
          expiresAt: result.value.expiresAt,
        },
      });
    } catch (error) {
      console.error("[IMPORT_TRACE][EVENT_BUS] previewImport:publish:error", {
        code: "EVENT_BUS_PUBLISH_ERROR",
        cause: error instanceof Error ? error.message : "unknown",
      });
    }
    console.info("[IMPORT_TRACE][FACADE] previewImport:done", {
      state: this.state.name,
      previewId: result.value.previewId,
      total: result.value.summary.total,
      blockingCount: result.value.summary.blockingCount,
      isBlocking: result.value.isBlocking,
      issueCodes: result.value.issues.map((x) => x.code).slice(0, 10),
    });
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
      console.warn("[IMPORT_TRACE][FACADE] commitImport:fsm-desync", {
        state: this.state.name,
        incomingPreviewId,
      });
    } else if ((this.state.previewId ?? "").trim() !== incomingPreviewId) {
      console.warn("[IMPORT_TRACE][FACADE] commitImport:preview-id-mismatch", {
        statePreviewId: this.state.previewId,
        incomingPreviewId,
      });
    }

    if (this.state.name === "previewReady") {
      this.state = importFsmTransition(this.state, { type: "APPLY_REQUESTED" });
      if (this.state.name === "error") {
        return {
          ok: false as const,
          error: appError("IMPORT_BLOCKED_BY_VALIDATION", "No se puede aplicar un preview bloqueante."),
        };
      }
    }

    console.info("[IMPORT_TRACE][FACADE] commitImport:start", {
      state: this.state.name,
      projectId: input.projectId,
      previewId: incomingPreviewId,
    });
    const result = await this.commitUseCase.execute(input);
    if (!result.ok) {
      if (this.state.name === "applying") {
        this.state = importFsmTransition(this.state, {
          type: "APPLY_FAIL",
          issues: [result.error.code],
        });
      }
      console.error("[IMPORT_TRACE][FACADE] commitImport:error", {
        code: result.error.code,
        message: result.error.message,
      });
      return result;
    }

    if (this.state.name === "applying") {
      this.state = importFsmTransition(this.state, { type: "APPLY_OK" });
    }
    try {
      await this.eventBus.publish({
        name: DomainEventNames.ImportCommitted,
        occurredAt: new Date().toISOString(),
        version: 1,
        aggregateId: input.projectId,
        payload: {
          projectId: input.projectId,
          previewId: incomingPreviewId,
          importedCount: result.value.importedCount,
        },
      });
    } catch (error) {
      console.error("[IMPORT_TRACE][EVENT_BUS] commitImport:publish:error", {
        code: "EVENT_BUS_PUBLISH_ERROR",
        cause: error instanceof Error ? error.message : "unknown",
      });
    }
    console.info("[IMPORT_TRACE][FACADE] commitImport:done", {
      state: this.state.name,
      importedCount: result.value.importedCount,
    });
    return result;
  }
}
