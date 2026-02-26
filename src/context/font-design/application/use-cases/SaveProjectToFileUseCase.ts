import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { FileSystemGateway, ProjectRepository, ProjectSerializer } from "../../domain/ports";

export interface SaveProjectToFileInput {
  projectId: string;
  filename: string;
}

export interface SaveProjectToFileOutput {
  projectId: string;
  filename: string;
  byteLength: number;
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class SaveProjectToFileUseCase implements UseCase<SaveProjectToFileInput, SaveProjectToFileOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectSerializer: ProjectSerializer,
    private readonly fileSystemGateway: FileSystemGateway,
  ) {}

  async execute(input: SaveProjectToFileInput): Promise<Result<SaveProjectToFileOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const serialized = this.projectSerializer.serialize(project);
    await this.fileSystemGateway.saveFile(input.filename, serialized);

    return {
      ok: true,
      value: {
        projectId: input.projectId,
        filename: input.filename,
        byteLength: serialized.length,
      },
    };
  }
}
