import type { Clock, ProjectRepository, ProjectSerializer, FileSystemGateway } from "../../domain/ports";
import type { AppError } from "../../shared/errors/AppError";
import { CreateTypefaceUseCase } from "../use-cases";
import type { CreateTypefaceInput } from "../use-cases/CreateTypefaceUseCase";

function appError(code: string, message: string): AppError {
  return {
    code,
    message,
    recoverable: true,
    layer: "application",
    severity: "error",
  };
}

export class ProjectFacade {
  constructor(
    private readonly createTypefaceUseCase: CreateTypefaceUseCase,
    private readonly projectRepository: ProjectRepository,
    private readonly projectSerializer: ProjectSerializer,
    private readonly fileSystemGateway: FileSystemGateway,
    private readonly clock: Clock,
  ) {}

  async createProject(input: CreateTypefaceInput) {
    return this.createTypefaceUseCase.execute(input);
  }

  async saveProjectToFile(projectId: string, filename: string) {
    const project = await this.projectRepository.load(projectId);
    if (!project) {
      return { ok: false as const, error: appError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const serialized = this.projectSerializer.serialize(project);
    await this.fileSystemGateway.saveFile(filename, serialized);

    return {
      ok: true as const,
      value: {
        filename,
        byteLength: serialized.length,
        exportedAt: this.clock.now(),
      },
    };
  }

  async loadProjectFromFile(accept: string[] = [".json"]) {
    const picked = await this.fileSystemGateway.pickFile(accept);
    if (!picked) {
      return { ok: false as const, error: appError("FILE_NOT_SELECTED", "No se selecciono archivo.") };
    }

    let snapshot;
    try {
      snapshot = this.projectSerializer.deserialize(picked.content);
    } catch {
      return { ok: false as const, error: appError("INVALID_PROJECT_SNAPSHOT", "Snapshot invalido.") };
    }

    await this.projectRepository.save(snapshot);
    return {
      ok: true as const,
      value: {
        projectId: snapshot.projectId,
        filename: picked.name,
      },
    };
  }
}
