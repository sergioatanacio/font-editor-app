import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, GlyphOutlineSnapshot, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphOutline } from "../../domain/value-objects/GlyphOutline";

export interface ReplaceGlyphOutlineInput {
  projectId: string;
  glyphId: string;
  outline: GlyphOutlineSnapshot;
}

export interface ReplaceGlyphOutlineOutput {
  projectId: string;
  glyphId: string;
  updatedAt: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

function fromDomainError(error: { code: string; message: string; context?: Readonly<Record<string, unknown>> }): AppError {
  return { code: error.code, message: error.message, context: error.context, layer: "domain", severity: "error", recoverable: false };
}

export class ReplaceGlyphOutlineUseCase implements UseCase<ReplaceGlyphOutlineInput, ReplaceGlyphOutlineOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ReplaceGlyphOutlineInput): Promise<Result<ReplaceGlyphOutlineOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    const glyphId = GlyphId.create(input.glyphId);
    if (!glyphId.ok) {
      return { ok: false, error: fromDomainError(glyphId.error) };
    }

    const outline = GlyphOutline.create(
      input.outline.contours.map((contour) => contour.map((command) => ({ type: command.type, values: command.values }))),
    );
    if (!outline.ok) {
      return { ok: false, error: fromDomainError(outline.error) };
    }

    const replaced = typefaceResult.value.replaceGlyphOutline(glyphId.value, outline.value);
    if (!replaced.ok) {
      return { ok: false, error: fromDomainError(replaced.error) };
    }

    const updatedAt = this.clock.now();
    await this.projectRepository.save({
      ...project,
      typeface: toTypefaceSnapshot(replaced.value),
      updatedAt,
    });

    return { ok: true, value: { projectId: input.projectId, glyphId: input.glyphId, updatedAt } };
  }
}
