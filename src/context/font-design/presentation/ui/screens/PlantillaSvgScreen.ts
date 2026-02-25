import { errorState, idleState, type ViewState } from "../state/ViewState";

export interface PlantillaSvgData {
  statusMessage?: string;
}

export class PlantillaSvgScreen {
  private viewState: ViewState<PlantillaSvgData> = idleState({ statusMessage: "Listo para generar plantilla SVG." });

  getState(): ViewState<PlantillaSvgData> {
    return this.viewState;
  }

  async generateAndDownloadTemplate(): Promise<ViewState<PlantillaSvgData>> {
    this.viewState = errorState(
      {
        code: "NOT_IMPLEMENTED",
        message: "GenerateTemplateSvg aun no esta implementado en application.",
        recoverable: true,
      },
      this.viewState.data,
    );
    return this.viewState;
  }
}
