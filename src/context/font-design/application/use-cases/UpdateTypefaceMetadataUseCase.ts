import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { TypefaceMetadata } from "../../domain/value-objects/TypefaceMetadata";

export interface UpdateTypefaceMetadataInput {
  projectId: string;
  familyName: string;
  styleName: string;
  designer?: string;
  version?: string;
}

export interface UpdateTypefaceMetadataOutput {
  projectId: string;
  updatedAt: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

function fromDomainError(error: { code: string; message: string; context?: Readonly<Record<string, unknown>> }): AppError {
  return { code: error.code, message: error.message, context: error.context, layer: "domain", severity: "error", recoverable: false };
}

export class UpdateTypefaceMetadataUseCase implements UseCase<UpdateTypefaceMetadataInput, UpdateTypefaceMetadataOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTypefaceMetadataInput): Promise<Result<UpdateTypefaceMetadataOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    const metadata = TypefaceMetadata.create({
      familyName: input.familyName,
      styleName: input.styleName,
      designer: input.designer,
      version: input.version,
    });
    if (!metadata.ok) {
      return { ok: false, error: fromDomainError(metadata.error) };
    }

    const nextTypeface = typefaceResult.value.changeMetadata(metadata.value);
    const updatedAt = this.clock.now();

    await this.projectRepository.save({
      ...project,
      typeface: toTypefaceSnapshot(nextTypeface),
      updatedAt,
    });

    return { ok: true, value: { projectId: input.projectId, updatedAt } };
  }
}
