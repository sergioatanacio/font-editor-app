import { loadingState, successState, errorState, idleState, type ViewState } from "../state/ViewState";
import type { ProjectFacade } from "../../../slices";

export interface ConfiguracionFuenteData {
  baseline: 0;
  editableFields: readonly ["familyName", "styleName", "designer", "version", "unitsPerEm", "ascender", "descender", "lineGap"];
  updatedAt?: string;
}

export class ConfiguracionFuenteScreen {
  private viewState: ViewState<ConfiguracionFuenteData> = idleState({
    baseline: 0,
    editableFields: ["familyName", "styleName", "designer", "version", "unitsPerEm", "ascender", "descender", "lineGap"],
  });

  constructor(private readonly projectFacade: ProjectFacade) {}

  getState(): ViewState<ConfiguracionFuenteData> {
    return this.viewState;
  }

  async saveChanges(input: {
    projectId: string;
    familyName: string;
    styleName: string;
    designer?: string;
    version?: string;
    letterSpacing?: number;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    lineGap: number;
  }): Promise<ViewState<ConfiguracionFuenteData>> {
    this.viewState = loadingState(this.viewState.data);

    const metadata = await this.projectFacade.updateTypefaceMetadata({
      projectId: input.projectId,
      familyName: input.familyName,
      styleName: input.styleName,
      designer: input.designer,
      version: input.version,
      letterSpacing: input.letterSpacing,
    });

    if (!metadata.ok) {
      this.viewState = errorState({
        code: metadata.error.code,
        message: metadata.error.message,
        recoverable: metadata.error.recoverable,
      }, this.viewState.data);
      return this.viewState;
    }

    const metrics = await this.projectFacade.updateTypefaceMetrics({
      projectId: input.projectId,
      unitsPerEm: input.unitsPerEm,
      ascender: input.ascender,
      descender: input.descender,
      lineGap: input.lineGap,
      baseline: 0,
    });

    if (!metrics.ok) {
      this.viewState = errorState({
        code: metrics.error.code,
        message: metrics.error.message,
        recoverable: metrics.error.recoverable,
      }, this.viewState.data);
      return this.viewState;
    }

    this.viewState = successState({
      baseline: 0,
      editableFields: ["familyName", "styleName", "designer", "version", "unitsPerEm", "ascender", "descender", "lineGap"],
      updatedAt: metrics.value.updatedAt,
    });

    return this.viewState;
  }
}
