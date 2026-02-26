import type { UiRoute } from "../context/font-design/presentation/ui/routing/UiRoute";
import type { FontDesignApp } from "../context/font-design/main";

export type StatusKind = "success" | "error" | "warning";
export type PreviewSelection = "all" | "ok" | "warning" | "error" | "empty";

export interface AppState {
  route: UiRoute;
  projectId: string;
  previewId: string;
  status: string;
  statusKind: StatusKind;
  previewSelection: PreviewSelection;
  importFilename: string;
  importSvgContent: string;
}

export interface UiContext {
  app: FontDesignApp;
  state: AppState;
  routes: UiRoute[];
  render: () => void;
  setStatus: (kind: StatusKind, message: string) => void;
  clearStatus: () => void;
  ensureProjectId: () => string | null;
}
