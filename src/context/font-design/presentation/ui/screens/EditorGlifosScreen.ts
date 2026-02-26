import { errorState, idleState, loadingState, successState, type ViewState } from "../state/ViewState";
import type { TypefaceFacade } from "../../../application/facades/TypefaceFacade";

export interface EditorGlifosData {
  note: string;
  lastOperation?: string;
  updatedAt?: string;
}

export class EditorGlifosScreen {
  private viewState: ViewState<EditorGlifosData> = idleState({
    note: "Asignacion Unicode, reemplazo de outline y metricas por glifo.",
  });

  constructor(private readonly typefaceFacade: TypefaceFacade) {}

  getState(): ViewState<EditorGlifosData> {
    return this.viewState;
  }

  async assignUnicode(input: { projectId: string; glyphId: string; codePoint: number }) {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.typefaceFacade.assignUnicode(input);

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
      note: this.viewState.data?.note ?? "",
      lastOperation: `Unicode ${result.value.codePoint} asignado a ${result.value.glyphId}`,
      updatedAt: result.value.updatedAt,
    });

    return this.viewState;
  }

  async replaceOutline(input: {
    projectId: string;
    glyphId: string;
    outline: { contours: Array<Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>> };
  }) {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.typefaceFacade.replaceOutline(input);

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
      note: this.viewState.data?.note ?? "",
      lastOperation: `Outline reemplazado para ${result.value.glyphId}`,
      updatedAt: result.value.updatedAt,
    });

    return this.viewState;
  }

  async updateGlyphMetrics(input: { projectId: string; glyphId: string; advanceWidth: number; leftSideBearing: number }) {
    this.viewState = loadingState(this.viewState.data);
    const result = await this.typefaceFacade.updateGlyphMetrics(input);

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
      note: this.viewState.data?.note ?? "",
      lastOperation: `Metricas actualizadas para ${result.value.glyphId}`,
      updatedAt: result.value.updatedAt,
    });

    return this.viewState;
  }
}
