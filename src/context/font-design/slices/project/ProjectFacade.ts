import type { Clock, FileSystemGateway, ProjectRepository, ProjectSerializer } from "../../domain/ports";
import { CreateTypefaceUseCase, type CreateTypefaceInput } from "./CreateTypefaceUseCase";
import { LoadProjectFromFileUseCase } from "./LoadProjectFromFileUseCase";
import { SaveProjectToFileUseCase } from "./SaveProjectToFileUseCase";
import { UpdateTypefaceMetadataUseCase } from "./UpdateTypefaceMetadataUseCase";
import { UpdateTypefaceMetricsUseCase } from "./UpdateTypefaceMetricsUseCase";
import type { Result } from "../../shared/result/Result";
import type { AppError } from "../../shared/errors/AppError";

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class ProjectFacade {
  constructor(
    private readonly createTypefaceUseCase: CreateTypefaceUseCase,
    private readonly updateTypefaceMetadataUseCase: UpdateTypefaceMetadataUseCase,
    private readonly updateTypefaceMetricsUseCase: UpdateTypefaceMetricsUseCase,
    private readonly saveProjectToFileUseCase: SaveProjectToFileUseCase,
    private readonly loadProjectFromFileUseCase: LoadProjectFromFileUseCase,
    private readonly projectRepository: ProjectRepository,
    private readonly projectSerializer: ProjectSerializer,
    private readonly fileSystemGateway: FileSystemGateway,
    private readonly clock: Clock,
  ) {}

  async createProject(input: CreateTypefaceInput) {
    return this.createTypefaceUseCase.execute(input);
  }

  async updateTypefaceMetadata(input: {
    projectId: string;
    familyName: string;
    styleName: string;
    designer?: string;
    version?: string;
  }) {
    return this.updateTypefaceMetadataUseCase.execute(input);
  }

  async updateTypefaceMetrics(input: {
    projectId: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    lineGap: number;
    baseline?: number;
  }) {
    return this.updateTypefaceMetricsUseCase.execute(input);
  }

  async saveProjectToFile(projectId: string, filename: string) {
    return this.saveProjectToFileUseCase.execute({ projectId, filename });
  }

  async loadProjectFromFile(accept: string[] = [".json"]) {
    return this.loadProjectFromFileUseCase.execute({ accept });
  }

  supportsLinkedProjectFile(): boolean {
    return this.fileSystemGateway.supportsLinkedFile?.() ?? false;
  }

  getLinkedProjectFilename(): string | null {
    return this.fileSystemGateway.getLinkedFilename?.() ?? null;
  }

  async linkProjectFile(suggestedName = "proyecto-tipografia.json"): Promise<Result<{ filename: string }, AppError>> {
    if (!this.fileSystemGateway.linkFile) {
      return { ok: false, error: asAppError("LINKED_FILE_NOT_SUPPORTED", "El navegador no soporta archivo vinculado.") };
    }
    const linked = await this.fileSystemGateway.linkFile(suggestedName);
    if (!linked) {
      return { ok: false, error: asAppError("LINKED_FILE_NOT_SELECTED", "No se selecciono archivo vinculado.") };
    }
    return { ok: true, value: linked };
  }

  async saveProjectToLinkedFile(projectId: string): Promise<Result<{ filename: string; byteLength: number }, AppError>> {
    if (!this.fileSystemGateway.saveLinkedFile) {
      return { ok: false, error: asAppError("LINKED_FILE_NOT_SUPPORTED", "El navegador no soporta guardado vinculado.") };
    }
    const project = await this.projectRepository.load(projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }
    const serialized = this.projectSerializer.serialize(project);
    const linked = await this.fileSystemGateway.saveLinkedFile(serialized);
    if (!linked) {
      return { ok: false, error: asAppError("LINKED_FILE_NOT_INITIALIZED", "Primero vincula un archivo de proyecto.") };
    }
    return {
      ok: true,
      value: {
        filename: linked.filename,
        byteLength: serialized.length,
      },
    };
  }
}
