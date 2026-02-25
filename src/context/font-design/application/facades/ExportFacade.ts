import { exportFsmInitialState, exportFsmTransition, type ExportFsmState } from "../fsm/export-ttf/exportTtfFsm";
import type { ProjectRepository } from "../../domain/ports";
import type { AppError } from "../../shared/errors/AppError";
import { toDomainTypeface } from "../use-cases";
import { ExportTypefaceToTtfUseCase } from "../use-cases";

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
  errors: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
}

export class ExportFacade {
  private state: ExportFsmState = exportFsmInitialState;

  constructor(
    private readonly exportUseCase: ExportTypefaceToTtfUseCase,
    private readonly projectRepository: ProjectRepository,
  ) {}

  getState(): ExportFsmState {
    return this.state;
  }

  reset(): ExportFsmState {
    this.state = exportFsmTransition(this.state, { type: "RESET" });
    return this.state;
  }

  async validateReadiness(projectId: string): Promise<ExportReadinessReport> {
    const project = await this.projectRepository.load(projectId);
    if (!project) {
      return {
        isReady: false,
        errors: [{ code: "PROJECT_NOT_FOUND", message: "No se encontro el proyecto." }],
        warnings: [],
      };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return {
        isReady: false,
        errors: [{ code: typefaceResult.error.code, message: typefaceResult.error.message }],
        warnings: [],
      };
    }

    const typeface = typefaceResult.value;
    const errors: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];

    if (typeface.glyphs.size === 0) {
      errors.push({ code: "MISSING_REQUIRED_GLYPH", message: "No hay glifos para exportar." });
    }

    if (project.exportPreset === "minimal-latin") {
      const hasNotdef = Array.from(typeface.glyphs.values()).some((x) => x.name.toString() === ".notdef");
      if (!hasNotdef) {
        errors.push({ code: "MISSING_REQUIRED_GLYPH", message: "Falta .notdef para preset minimal-latin." });
      }
    }

    if (typeface.glyphs.size < 5) {
      warnings.push({ code: "LOW_GLYPH_COUNT", message: "Cantidad de glifos muy baja para una fuente util." });
    }

    return {
      isReady: errors.length === 0,
      errors,
      warnings,
    };
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
