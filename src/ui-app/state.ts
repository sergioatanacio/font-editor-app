import type { UiRoute } from "../context/font-design/presentation/ui/routing/UiRoute";
import type { AppState, StatusKind } from "./types";

export const routes: UiRoute[] = [
  "InicioProyecto",
  "ConfiguracionFuente",
  "PlantillaSvg",
  "ImportacionSvg",
  "PrevisualizacionImportacion",
  "EditorGlifos",
  "ValidacionExportacion",
  "ExportacionTtf",
  "GuardarAbrirProyecto",
  "PanelErrores",
];

export function createInitialState(): AppState {
  return {
    route: "InicioProyecto",
    projectId: "",
    previewId: "",
    status: "",
    statusKind: "success",
    previewSelection: "all",
    importFilename: "template-editado.svg",
    importSvgContent: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    specimenText: "ABCD",
    specimenLetterSpacing: 0,
    specimenKerningPairs: {},
    kerningMode: false,
    kerningPairLeftRunIndex: null,
    kerningPairRightRunIndex: null,
    kerningDraftValue: 0,
    specimenZoomPercent: 100,
    selectedRunIndex: 0,
    selectedGlyphId: "",
    editMoveX: 0,
    editMoveY: 0,
    editScale: 1,
    glyphLoadVersion: 0,
    autosaveDirty: false,
    autosaveSaving: false,
    autosaveLastSavedAt: "",
    autosaveError: "",
    linkedProjectFilename: "",
    linkedProjectSupported: false,
    snapBaseline: true,
    snapGrid: false,
    snapGridSize: 10,
    historyUndo: [],
    historyRedo: [],
    historyCanUndo: false,
    historyCanRedo: false,
    historyDepth: 0,
    activeHandle: "none",
  };
}

export function setStatus(state: AppState, kind: StatusKind, message: string): void {
  state.statusKind = kind;
  state.status = message;
}

export function clearStatus(state: AppState): void {
  state.status = "";
}
