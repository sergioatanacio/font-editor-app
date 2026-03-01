export type ImportStateName =
  | "idle"
  | "loadingFile"
  | "parsing"
  | "mapping"
  | "validating"
  | "previewReady"
  | "applying"
  | "applied"
  | "error";

export interface ImportSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  empty: number;
  blockingCount: number;
}

export interface ImportFsmState {
  readonly name: ImportStateName;
  readonly filename?: string;
  readonly svgContent?: string;
  readonly previewId?: string;
  readonly summary?: ImportSummary;
  readonly isBlocking?: boolean;
  readonly expiresAt?: string;
  readonly issues?: readonly string[];
  readonly errorReason?: string;
}

export type ImportFsmEvent =
  | { type: "SELECT_FILE"; filename: string }
  | { type: "FILE_LOADED"; svgContent: string }
  | { type: "LOAD_FAIL"; issues: readonly string[] }
  | { type: "PARSE_OK" }
  | { type: "PARSE_FAIL"; issues: readonly string[] }
  | { type: "MAP_OK" }
  | { type: "MAP_FAIL"; issues: readonly string[] }
  | {
      type: "VALIDATION_OK";
      previewId: string;
      summary: ImportSummary;
      expiresAt: string;
      isBlocking: false;
    }
  | {
      type: "VALIDATION_FAIL";
      previewId: string;
      summary: ImportSummary;
      issues: readonly string[];
      expiresAt: string;
      isBlocking: true;
    }
  | { type: "APPLY_REQUESTED" }
  | { type: "APPLY_OK" }
  | { type: "APPLY_FAIL"; issues: readonly string[] }
  | { type: "CANCEL_IMPORT"; reason?: string }
  | { type: "RESET" };

export const importFsmInitialState: ImportFsmState = {
  name: "idle",
};

function toError(
  state: ImportFsmState,
  issues: readonly string[],
  reason?: string,
): ImportFsmState {
  return {
    ...state,
    name: "error",
    issues,
    errorReason: reason,
  };
}

function toIdle(): ImportFsmState {
  return { name: "idle" };
}

export function importFsmTransition(
  state: ImportFsmState,
  event: ImportFsmEvent,
): ImportFsmState {
  switch (state.name) {
    case "idle": {
      if (event.type === "SELECT_FILE") {
        return { name: "loadingFile", filename: event.filename };
      }
      if (event.type === "RESET") {
        return state;
      }
      return state;
    }

    case "loadingFile": {
      if (event.type === "FILE_LOADED") {
        return { ...state, name: "parsing", svgContent: event.svgContent };
      }
      if (event.type === "LOAD_FAIL") {
        return toError(state, event.issues, "load-fail");
      }
      if (event.type === "CANCEL_IMPORT") {
        return toIdle();
      }
      return state;
    }

    case "parsing": {
      if (event.type === "PARSE_OK") {
        return { ...state, name: "mapping" };
      }
      if (event.type === "PARSE_FAIL") {
        return toError(state, event.issues, "parse-fail");
      }
      if (event.type === "CANCEL_IMPORT") {
        return toIdle();
      }
      return state;
    }

    case "mapping": {
      if (event.type === "MAP_OK") {
        return { ...state, name: "validating" };
      }
      if (event.type === "MAP_FAIL") {
        return toError(state, event.issues, "map-fail");
      }
      if (event.type === "CANCEL_IMPORT") {
        return toIdle();
      }
      return state;
    }

    case "validating": {
      if (event.type === "VALIDATION_OK") {
        return {
          ...state,
          name: "previewReady",
          previewId: event.previewId,
          summary: event.summary,
          isBlocking: false,
          expiresAt: event.expiresAt,
          issues: [],
        };
      }

      if (event.type === "VALIDATION_FAIL") {
        return {
          ...state,
          name: "previewReady",
          previewId: event.previewId,
          summary: event.summary,
          isBlocking: true,
          expiresAt: event.expiresAt,
          issues: event.issues,
        };
      }

      if (event.type === "CANCEL_IMPORT") {
        return toIdle();
      }

      return state;
    }

    case "previewReady": {
      if (event.type === "APPLY_REQUESTED") {
        if (state.isBlocking === true) {
          return toError(
            state,
            state.issues ?? ["IMPORT_BLOCKED_BY_VALIDATION"],
            "apply-blocked",
          );
        }

        return { ...state, name: "applying" };
      }

      if (event.type === "CANCEL_IMPORT") {
        return toIdle();
      }

      return state;
    }

    case "applying": {
      if (event.type === "APPLY_OK") {
        return { ...state, name: "applied" };
      }

      if (event.type === "APPLY_FAIL") {
        return toError(state, event.issues, "apply-fail");
      }

      return state;
    }

    case "applied": {
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
