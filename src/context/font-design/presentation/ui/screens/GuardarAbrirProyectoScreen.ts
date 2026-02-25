import type { ProjectFacade } from "../../../application/facades/ProjectFacade";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";

export interface GuardarAbrirProyectoData {
  projectId?: string;
  filename?: string;
  byteLength?: number;
}

export class GuardarAbrirProyectoScreen {
  private viewState: ViewState<GuardarAbrirProyectoData> = idleState();

  constructor(private readonly projectFacade: ProjectFacade) {}

  getState(): ViewState<GuardarAbrirProyectoData> {
    return this.viewState;
  }

  async save(projectId: string, filename: string) {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.projectFacade.saveProjectToFile(projectId, filename);

    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      }, this.viewState.data);
      return this.viewState;
    }

    this.viewState = successState({
      projectId,
      filename: result.value.filename,
      byteLength: result.value.byteLength,
    });
    return this.viewState;
  }

  async open() {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.projectFacade.loadProjectFromFile([".json"]);

    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      }, this.viewState.data);
      return this.viewState;
    }

    this.viewState = successState({
      projectId: result.value.projectId,
      filename: result.value.filename,
    });
    return this.viewState;
  }
}
