import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { ProjectRepository, TypefaceSnapshot } from "../../domain/ports";

export interface GetTypefaceSnapshotInput {
  projectId: string;
}

export interface GetTypefaceSnapshotOutput {
  projectId: string;
  typeface: TypefaceSnapshot;
  updatedAt: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class GetTypefaceSnapshotUseCase implements UseCase<GetTypefaceSnapshotInput, GetTypefaceSnapshotOutput, AppError> {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(input: GetTypefaceSnapshotInput): Promise<Result<GetTypefaceSnapshotOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    return {
      ok: true,
      value: {
        projectId: input.projectId,
        typeface: project.typeface,
        updatedAt: project.updatedAt,
      },
    };
  }
}
