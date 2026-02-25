export type UiRoute =
  | "InicioProyecto"
  | "ConfiguracionFuente"
  | "PlantillaSvg"
  | "ImportacionSvg"
  | "PrevisualizacionImportacion"
  | "EditorGlifos"
  | "ValidacionExportacion"
  | "ExportacionTtf"
  | "GuardarAbrirProyecto"
  | "PanelErrores";

export const initialRoute: UiRoute = "InicioProyecto";
