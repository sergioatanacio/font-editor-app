import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { ProjectRepository } from "../../domain/ports";
import { ExportReadinessDomainService } from "../../domain/services";
import { toDomainTypeface } from "./typefaceSnapshotMapper";

export interface ValidateTypefaceForExportInput {
  projectId: string;
}

export interface ValidateTypefaceForExportOutput {
  isReady: boolean;
  errors: Array<{ code: string; message: string; glyphId?: string }>;
  warnings: Array<{ code: string; message: string; glyphId?: string }>;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class ValidateTypefaceForExportUseCase
  implements UseCase<ValidateTypefaceForExportInput, ValidateTypefaceForExportOutput, AppError>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly exportReadinessDomainService: ExportReadinessDomainService = new ExportReadinessDomainService(),
  ) {}

  async execute(input: ValidateTypefaceForExportInput): Promise<Result<ValidateTypefaceForExportOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    const report = this.exportReadinessDomainService.validate(typefaceResult.value, project.exportPreset);

    console.info("[EXPORT_TRACE][READINESS] report", {
      projectId: input.projectId,
      isReady: report.isReady,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      errorCodes: report.errors.map((x) => x.code).slice(0, 20),
      warningCodes: report.warnings.map((x) => x.code).slice(0, 20),
    });

    return {
      ok: true,
      value: {
        isReady: report.isReady,
        errors: report.errors,
        warnings: report.warnings,
      },
    };
  }
}
