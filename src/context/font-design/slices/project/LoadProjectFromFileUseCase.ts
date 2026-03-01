import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { FileSystemGateway, ProjectRepository, ProjectSerializer } from "../../domain/ports";

export interface LoadProjectFromFileInput {
  accept?: string[];
}

export interface LoadProjectFromFileOutput {
  projectId: string;
  filename: string;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class LoadProjectFromFileUseCase implements UseCase<LoadProjectFromFileInput, LoadProjectFromFileOutput, AppError> {
  constructor(
    private readonly fileSystemGateway: FileSystemGateway,
    private readonly projectSerializer: ProjectSerializer,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(input: LoadProjectFromFileInput): Promise<Result<LoadProjectFromFileOutput, AppError>> {
    const picked = await this.fileSystemGateway.pickFile(input.accept ?? [".json"]);
    if (!picked) {
      return { ok: false, error: asAppError("FILE_NOT_SELECTED", "No se selecciono archivo.") };
    }

    let snapshot;
    try {
      snapshot = this.projectSerializer.deserialize(picked.content);
    } catch {
      return { ok: false, error: asAppError("INVALID_PROJECT_SNAPSHOT", "Snapshot invalido.") };
    }

    await this.projectRepository.save(snapshot);

    return {
      ok: true,
      value: {
        projectId: snapshot.projectId,
        filename: picked.name,
      },
    };
  }
}
