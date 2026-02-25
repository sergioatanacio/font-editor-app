import { errorState, idleState, type ViewState } from "../state/ViewState";

export interface ConfiguracionFuenteData {
  baseline: 0;
  editableFields: readonly ["familyName", "styleName", "designer", "version", "unitsPerEm", "ascender", "descender", "lineGap"];
}

export class ConfiguracionFuenteScreen {
  private viewState: ViewState<ConfiguracionFuenteData> = idleState({
    baseline: 0,
    editableFields: ["familyName", "styleName", "designer", "version", "unitsPerEm", "ascender", "descender", "lineGap"],
  });

  getState(): ViewState<ConfiguracionFuenteData> {
    return this.viewState;
  }

  async saveChanges(): Promise<ViewState<ConfiguracionFuenteData>> {
    this.viewState = errorState({
      code: "NOT_IMPLEMENTED",
      message: "UpdateTypefaceMetadata/UpdateTypefaceMetrics aun no estan implementados en application.",
      recoverable: true,
    }, this.viewState.data);
    return this.viewState;
  }
}
