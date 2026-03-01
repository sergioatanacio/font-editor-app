export type ExportStateName =
  | "idle"
  | "validating"
  | "exporting"
  | "saving"
  | "done"
  | "error";

export interface ExportFsmState {
  readonly name: ExportStateName;
  readonly issues?: readonly string[];
  readonly byteLength?: number;
}

export type ExportFsmEvent =
  | { type: "EXPORT_REQUESTED" }
  | { type: "VALID_OK" }
  | { type: "VALID_FAIL"; issues: readonly string[] }
  | { type: "EXPORT_OK"; byteLength: number }
  | { type: "EXPORT_FAIL"; issues: readonly string[] }
  | { type: "SAVE_OK" }
  | { type: "SAVE_FAIL"; issues: readonly string[] }
  | { type: "RESET" };

export const exportFsmInitialState: ExportFsmState = {
  name: "idle",
};

function toError(
  state: ExportFsmState,
  issues: readonly string[],
): ExportFsmState {
  return {
    ...state,
    name: "error",
    issues,
  };
}

function toIdle(): ExportFsmState {
  return { name: "idle" };
}

export function exportFsmTransition(
  state: ExportFsmState,
  event: ExportFsmEvent,
): ExportFsmState {
  switch (state.name) {
    case "idle": {
      if (event.type === "EXPORT_REQUESTED") {
        return { ...state, name: "validating", issues: undefined, byteLength: undefined };
      }
      if (event.type === "RESET") {
        return state;
      }
      return state;
    }

    case "validating": {
      if (event.type === "VALID_OK") {
        return { ...state, name: "exporting" };
      }
      if (event.type === "VALID_FAIL") {
        return toError(state, event.issues);
      }
      return state;
    }

    case "exporting": {
      if (event.type === "EXPORT_OK") {
        return { ...state, name: "saving", byteLength: event.byteLength };
      }
      if (event.type === "EXPORT_FAIL") {
        return toError(state, event.issues);
      }
      return state;
    }

    case "saving": {
      if (event.type === "SAVE_OK") {
        return { ...state, name: "done" };
      }
      if (event.type === "SAVE_FAIL") {
        return toError(state, event.issues);
      }
      return state;
    }

    case "done": {
      if (event.type === "RESET") {
        return toIdle();
      }
      return state;
    }

    case "error": {
      if (event.type === "RESET") {
        return toIdle();
      }
      return state;
    }

    default:
      return state;
  }
}
