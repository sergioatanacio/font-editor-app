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

function signature(bytes: Uint8Array): string {
  if (bytes.byteLength < 4) {
    return "";
  }
  return String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
}

function replaceExt(filename: string, ext: ".otf" | ".ttf"): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return `font${ext}`;
  }
  if (/\.[^./\\]+$/.test(trimmed)) {
    return trimmed.replace(/\.[^./\\]+$/, ext);
  }
  return `${trimmed}${ext}`;
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

    let exported;
    try {
      exported = await this.fontBinaryExporter.exportTtf(typeface.value);
    } catch (error) {
      return {
        ok: false,
        error: asAppError("USE_CASE_EXECUTION_ERROR", "Fallo tecnico durante la exportacion TTF.", {
          cause: error instanceof Error ? error.message : "unknown",
        }),
      };
    }
    if (exported.bytes.byteLength <= 0) {
      return {
        ok: false,
        error: asAppError("USE_CASE_EXECUTION_ERROR", "El exportador retorno un binario vacio."),
      };
    }

    const sig = signature(exported.bytes);
    let outputFilename = input.filename;
    const outputWarnings: ExportIssue[] = [...exported.warnings];

    if (sig === "OTTO" && input.filename.toLowerCase().endsWith(".ttf")) {
      outputFilename = replaceExt(input.filename, ".otf");
      outputWarnings.push({
        code: "OUTPUT_FORMAT_CFF_OTF",
        message: "El binario generado es OpenType/CFF (OTF). Se ajusto extension .otf para compatibilidad.",
        severity: "warning",
      });
    }

    await this.fileSystemGateway.saveFile(outputFilename, exported.bytes);

    return {
      ok: true,
      value: {
        filename: outputFilename,
        byteLength: exported.bytes.byteLength,
        warnings: outputWarnings,
      },
    };
  }
}
