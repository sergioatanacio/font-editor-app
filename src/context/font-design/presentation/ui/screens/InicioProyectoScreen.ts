import type { ProjectFacade } from "../../../slices";
import { createExportPresetSelector } from "../components/ExportPresetSelector";
import {
  deriveTemplateCharacterPreset,
  isCharacterSelectionValid,
  type CharacterSetChecksModel,
} from "../components/CharacterSetChecks";
import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";

export interface InicioProyectoForm {
  familyName: string;
  styleName: string;
  unitsPerEm: number;
  exportPreset: "minimal-latin" | "freeform";
  characterChecks: CharacterSetChecksModel;
}

export interface InicioProyectoData {
  exportPresetSelector: ReturnType<typeof createExportPresetSelector>;
  derivedTemplatePreset: "latam-alnum" | "code-dev" | "latam-plus-code";
  projectId?: string;
}

export class InicioProyectoScreen {
  private viewState: ViewState<InicioProyectoData> = idleState({
    exportPresetSelector: createExportPresetSelector("minimal-latin"),
    derivedTemplatePreset: "latam-alnum",
  });

  constructor(private readonly projectFacade: ProjectFacade) {}

  getState(): ViewState<InicioProyectoData> {
    return this.viewState;
  }

  async create(form: InicioProyectoForm): Promise<ViewState<InicioProyectoData>> {
    if (!isCharacterSelectionValid(form.characterChecks)) {
      this.viewState = errorState({
        code: "INVALID_CHARACTER_SELECTION",
        message: "Debes activar al menos un conjunto de caracteres.",
        recoverable: true,
      });
      return this.viewState;
    }

    this.viewState = loadingState(this.viewState.data);

    const result = await this.projectFacade.createProject({
      familyName: form.familyName,
      styleName: form.styleName,
      unitsPerEm: form.unitsPerEm,
      exportPreset: form.exportPreset,
      templateCharacterSelection: {
        includeLatamAlnum: form.characterChecks.includeLatamAlnum,
        includeCodeChars: form.characterChecks.includeCodeChars,
      },
    });

    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      });
      return this.viewState;
    }

    this.viewState = successState({
      projectId: result.value.projectId,
      exportPresetSelector: createExportPresetSelector(form.exportPreset),
      derivedTemplatePreset: deriveTemplateCharacterPreset(form.characterChecks),
    });

    return this.viewState;
  }

  async openFromSnapshot(): Promise<ViewState<InicioProyectoData>> {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.projectFacade.loadProjectFromFile([".json"]);

    if (!result.ok) {
      this.viewState = errorState({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      });
      return this.viewState;
    }

    this.viewState = successState({
      projectId: result.value.projectId,
      exportPresetSelector: createExportPresetSelector("minimal-latin"),
      derivedTemplatePreset: "latam-alnum",
    });

    return this.viewState;
  }
}
