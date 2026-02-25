import { errorState, idleState, type ViewState } from "../state/ViewState";

export interface EditorGlifosData {
  note: string;
}

export class EditorGlifosScreen {
  private viewState: ViewState<EditorGlifosData> = idleState({
    note: "Asignacion Unicode, reemplazo de outline y metricas por glifo.",
  });

  getState(): ViewState<EditorGlifosData> {
    return this.viewState;
  }

  async mutateGlyphs() {
    this.viewState = errorState(
      {
        code: "NOT_IMPLEMENTED",
        message: "AssignUnicodeToGlyph/ReplaceGlyphOutline/UpdateGlyphMetrics aun no implementados en application.",
        recoverable: true,
      },
      this.viewState.data,
    );
    return this.viewState;
  }
}
