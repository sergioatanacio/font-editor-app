import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { UnicodeCodePoint } from "../../domain/value-objects/UnicodeCodePoint";

export interface AssignUnicodeToGlyphInput {
  projectId: string;
  glyphId: string;
  codePoint: number;
}

export interface AssignUnicodeToGlyphOutput {
  projectId: string;
  glyphId: string;
  codePoint: number;
  updatedAt: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

function fromDomainError(error: { code: string; message: string; context?: Readonly<Record<string, unknown>> }): AppError {
  return { code: error.code, message: error.message, context: error.context, layer: "domain", severity: "error", recoverable: false };
}

export class AssignUnicodeToGlyphUseCase implements UseCase<AssignUnicodeToGlyphInput, AssignUnicodeToGlyphOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AssignUnicodeToGlyphInput): Promise<Result<AssignUnicodeToGlyphOutput, AppError>> {
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

    const codePoint = UnicodeCodePoint.create(input.codePoint);
    if (!codePoint.ok) {
      return { ok: false, error: fromDomainError(codePoint.error) };
    }

    const assigned = typefaceResult.value.assignUnicode(glyphId.value, codePoint.value);
    if (!assigned.ok) {
      return { ok: false, error: fromDomainError(assigned.error) };
    }

    const updatedAt = this.clock.now();
    await this.projectRepository.save({
      ...project,
      typeface: toTypefaceSnapshot(assigned.value),
      updatedAt,
    });

    return { ok: true, value: { projectId: input.projectId, glyphId: input.glyphId, codePoint: input.codePoint, updatedAt } };
  }
}
