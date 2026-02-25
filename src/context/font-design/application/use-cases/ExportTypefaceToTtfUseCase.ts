import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { ExportIssue, FileSystemGateway, FontBinaryExporter, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface } from "./typefaceSnapshotMapper";

export interface ExportTypefaceToTtfInput {
  projectId: string;
  filename: string;
}

export interface ExportTypefaceToTtfOutput {
  filename: string;
  byteLength: number;
  warnings: readonly ExportIssue[];
}

function asAppError(code: string, message: string, context?: Record<string, unknown>): AppError {
  return {
    code,
    message,
    context,
    layer: "application",
    severity: "error",
    recoverable: true,
  };
}

export class ExportTypefaceToTtfUseCase
  implements UseCase<ExportTypefaceToTtfInput, ExportTypefaceToTtfOutput, AppError>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly fontBinaryExporter: FontBinaryExporter,
    private readonly fileSystemGateway: FileSystemGateway,
  ) {}

  async execute(
    input: ExportTypefaceToTtfInput,
  ): Promise<Result<ExportTypefaceToTtfOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return {
        ok: false,
        error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto."),
      };
    }

    const typeface = toDomainTypeface(project.typeface);
    if (!typeface.ok) {
      return { ok: false, error: typeface.error };
    }

    const exported = await this.fontBinaryExporter.exportTtf(typeface.value);
    if (exported.bytes.byteLength <= 0) {
      return {
        ok: false,
        error: asAppError("USE_CASE_EXECUTION_ERROR", "El exportador retorno un binario vacio."),
      };
    }

    await this.fileSystemGateway.saveFile(input.filename, exported.bytes);

    return {
      ok: true,
      value: {
        filename: input.filename,
        byteLength: exported.bytes.byteLength,
        warnings: exported.warnings,
      },
    };
  }
}
