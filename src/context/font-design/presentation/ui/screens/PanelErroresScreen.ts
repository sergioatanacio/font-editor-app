import { idleState, type ViewState } from "../state/ViewState";

export interface PanelErroresData {
  items: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
    recoverable: boolean;
    details?: Record<string, unknown>;
  }>;
}

export class PanelErroresScreen {
  private viewState: ViewState<PanelErroresData> = idleState({ items: [] });

  getState(): ViewState<PanelErroresData> {
    return this.viewState;
  }

  setErrors(items: PanelErroresData["items"]): ViewState<PanelErroresData> {
    this.viewState = {
      status: "success",
      data: { items },
      warnings: items.filter((x) => x.severity === "warning").map((x) => ({ code: x.code, message: x.message })),
    };
    return this.viewState;
  }

  clear(): ViewState<PanelErroresData> {
    this.viewState = idleState({ items: [] });
    return this.viewState;
  }
}
