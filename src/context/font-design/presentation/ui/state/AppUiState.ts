import type { UiRoute } from "../routing/UiRoute";

export interface AppUiState {
  route: UiRoute;
  currentProjectId?: string;
  selectedPreviewId?: string;
}
