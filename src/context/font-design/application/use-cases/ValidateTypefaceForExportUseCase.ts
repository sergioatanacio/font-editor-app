import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { ProjectRepository } from "../../domain/ports";
import { toDomainTypeface } from "./typefaceSnapshotMapper";
import { requiredGlyphNamesForExportPreset } from "./characterCatalog";

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
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(input: ValidateTypefaceForExportInput): Promise<Result<ValidateTypefaceForExportOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    const typeface = typefaceResult.value;
    const errors: Array<{ code: string; message: string; glyphId?: string }> = [];
    const warnings: Array<{ code: string; message: string; glyphId?: string }> = [];

    const byName = new Map(Array.from(typeface.glyphs.values()).map((glyph) => [glyph.name.toString(), glyph]));

    for (const requiredName of requiredGlyphNamesForExportPreset(project.exportPreset)) {
      const glyph = byName.get(requiredName);
      if (!glyph) {
        errors.push({ code: "MISSING_REQUIRED_GLYPH", message: `Falta glifo requerido: ${requiredName}.`, glyphId: requiredName });
        continue;
      }

      if (requiredName !== "space" && !glyph.outline.hasContours()) {
        errors.push({ code: "EMPTY_REQUIRED_OUTLINE", message: `Outline vacio para glifo requerido ${requiredName}.`, glyphId: requiredName });
      }
    }

    if (project.exportPreset === "freeform") {
      const nonNotdefOutlined = Array.from(typeface.glyphs.values()).filter((glyph) =>
        glyph.name.toString() !== ".notdef" && glyph.outline.hasContours(),
      );
      if (nonNotdefOutlined.length === 0) {
        errors.push({ code: "MISSING_REQUIRED_GLYPH", message: "freeform requiere al menos un glifo adicional no vacio." });
      }
    }

    if (typeface.glyphs.size < 5) {
      warnings.push({ code: "LOW_GLYPH_COUNT", message: "Cantidad de glifos muy baja para una fuente util." });
    }

    return {
      ok: true,
      value: {
        isReady: errors.length === 0,
        errors,
        warnings,
      },
    };
  }
}
