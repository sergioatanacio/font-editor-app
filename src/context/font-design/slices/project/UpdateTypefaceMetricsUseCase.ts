import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { FontMetrics } from "../../domain/value-objects/FontMetrics";

export interface UpdateTypefaceMetricsInput {
  projectId: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  baseline?: number;
}

export interface UpdateTypefaceMetricsOutput {
  projectId: string;
  updatedAt: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

function fromDomainError(error: { code: string; message: string; context?: Readonly<Record<string, unknown>> }): AppError {
  return { code: error.code, message: error.message, context: error.context, layer: "domain", severity: "error", recoverable: false };
}

export class UpdateTypefaceMetricsUseCase implements UseCase<UpdateTypefaceMetricsInput, UpdateTypefaceMetricsOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTypefaceMetricsInput): Promise<Result<UpdateTypefaceMetricsOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    const metrics = FontMetrics.create({
      unitsPerEm: input.unitsPerEm,
      ascender: input.ascender,
      descender: input.descender,
      lineGap: input.lineGap,
      baseline: input.baseline ?? 0,
    });
    if (!metrics.ok) {
      return { ok: false, error: fromDomainError(metrics.error) };
    }

    const nextTypeface = typefaceResult.value.changeFontMetrics(metrics.value);
    const updatedAt = this.clock.now();

    await this.projectRepository.save({
      ...project,
      typeface: toTypefaceSnapshot(nextTypeface),
      updatedAt,
    });

    return { ok: true, value: { projectId: input.projectId, updatedAt } };
  }
}
