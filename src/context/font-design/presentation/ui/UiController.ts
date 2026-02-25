import type { UiRoute } from "./routing/UiRoute";
import { initialRoute } from "./routing/UiRoute";
import type { AppUiState } from "./state/AppUiState";
import {
  ConfiguracionFuenteScreen,
  EditorGlifosScreen,
  ExportacionTtfScreen,
  GuardarAbrirProyectoScreen,
  ImportacionSvgScreen,
  InicioProyectoScreen,
  PanelErroresScreen,
  PlantillaSvgScreen,
  PrevisualizacionImportacionScreen,
  ValidacionExportacionScreen,
} from "./screens";

export interface UiScreens {
  inicioProyecto: InicioProyectoScreen;
  configuracionFuente: ConfiguracionFuenteScreen;
  plantillaSvg: PlantillaSvgScreen;
  importacionSvg: ImportacionSvgScreen;
  previsualizacionImportacion: PrevisualizacionImportacionScreen;
  editorGlifos: EditorGlifosScreen;
  validacionExportacion: ValidacionExportacionScreen;
  exportacionTtf: ExportacionTtfScreen;
  guardarAbrirProyecto: GuardarAbrirProyectoScreen;
  panelErrores: PanelErroresScreen;
}

export class UiController {
  private state: AppUiState = { route: initialRoute };

  constructor(readonly screens: UiScreens) {}

  getState(): AppUiState {
    return this.state;
  }

  navigate(route: UiRoute): AppUiState {
    this.state = {
      ...this.state,
      route,
    };
    return this.state;
  }

  setProject(projectId: string): AppUiState {
    this.state = {
      ...this.state,
      currentProjectId: projectId,
    };
    return this.state;
  }

  setPreview(previewId: string): AppUiState {
    this.state = {
      ...this.state,
      selectedPreviewId: previewId,
    };
    return this.state;
  }
}
