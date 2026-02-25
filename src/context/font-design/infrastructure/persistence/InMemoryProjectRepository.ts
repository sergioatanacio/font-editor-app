import type { ProjectRepository, TypefaceProjectSnapshot } from "../../domain/ports";

function cloneProject(project: TypefaceProjectSnapshot): TypefaceProjectSnapshot {
  return structuredClone(project);
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly store = new Map<string, TypefaceProjectSnapshot>();

  async save(project: TypefaceProjectSnapshot): Promise<void> {
    this.store.set(project.projectId, cloneProject(project));
  }

  async load(projectId: string): Promise<TypefaceProjectSnapshot | null> {
    const project = this.store.get(projectId);
    return project ? cloneProject(project) : null;
  }

  async delete(projectId: string): Promise<void> {
    this.store.delete(projectId);
  }
}
