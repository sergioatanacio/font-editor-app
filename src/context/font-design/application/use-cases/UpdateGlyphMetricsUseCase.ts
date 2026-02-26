import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphMetrics } from "../../domain/value-objects/GlyphMetrics";

export interface UpdateGlyphMetricsInput {
  projectId: string;
  glyphId: string;
  advanceWidth: number;
  leftSideBearing: number;
}

export interface UpdateGlyphMetricsOutput {
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

export class UpdateGlyphMetricsUseCase implements UseCase<UpdateGlyphMetricsInput, UpdateGlyphMetricsOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateGlyphMetricsInput): Promise<Result<UpdateGlyphMetricsOutput, AppError>> {
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

    const metrics = GlyphMetrics.create({
      advanceWidth: input.advanceWidth,
      leftSideBearing: input.leftSideBearing,
    });
    if (!metrics.ok) {
      return { ok: false, error: fromDomainError(metrics.error) };
    }

    const changed = typefaceResult.value.changeGlyphMetrics(glyphId.value, metrics.value);
    if (!changed.ok) {
      return { ok: false, error: fromDomainError(changed.error) };
    }

    const updatedAt = this.clock.now();
    await this.projectRepository.save({
      ...project,
      typeface: toTypefaceSnapshot(changed.value),
      updatedAt,
    });

    return { ok: true, value: { projectId: input.projectId, glyphId: input.glyphId, updatedAt } };
  }
}
