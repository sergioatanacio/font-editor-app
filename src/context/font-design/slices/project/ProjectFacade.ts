import type { Clock, FileSystemGateway, ProjectRepository, ProjectSerializer } from "../../domain/ports";
import { CreateTypefaceUseCase, type CreateTypefaceInput } from "./CreateTypefaceUseCase";
import { LoadProjectFromFileUseCase } from "./LoadProjectFromFileUseCase";
import { SaveProjectToFileUseCase } from "./SaveProjectToFileUseCase";
import { UpdateTypefaceMetadataUseCase } from "./UpdateTypefaceMetadataUseCase";
import { UpdateTypefaceMetricsUseCase } from "./UpdateTypefaceMetricsUseCase";

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
}
