import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";
import type { TemplateFacade } from "../../../application/facades/TypefaceFacade";

export interface PlantillaSvgData {
  statusMessage?: string;
  filename?: string;
  glyphCount?: number;
  templateCharacterPreset?: "latam-alnum" | "code-dev" | "latam-plus-code";
}

export class PlantillaSvgScreen {
  private viewState: ViewState<PlantillaSvgData> = idleState({ statusMessage: "Listo para generar plantilla SVG." });

  constructor(private readonly templateFacade: TemplateFacade) {}

  getState(): ViewState<PlantillaSvgData> {
    return this.viewState;
  }

  async generateAndDownloadTemplate(projectId: string, filename?: string): Promise<ViewState<PlantillaSvgData>> {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.templateFacade.generateTemplate({ projectId, filename });

    if (!result.ok) {
      this.viewState = errorState(
        {
          code: result.error.code,
          message: result.error.message,
          recoverable: result.error.recoverable,
        },
        this.viewState.data,
      );
      return this.viewState;
    }

    this.viewState = successState({
      statusMessage: "Plantilla generada y descargada.",
      filename: result.value.filename,
      glyphCount: result.value.glyphCount,
      templateCharacterPreset: result.value.templateCharacterPreset,
    });

    return this.viewState;
  }
}
