export type ViewState<T> = {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  warnings?: Array<{ code: string; message: string }>;
};

export function idleState<T>(data?: T): ViewState<T> {
  return { status: "idle", data };
}

export function loadingState<T>(data?: T): ViewState<T> {
  return { status: "loading", data };
}

export function successState<T>(data: T, warnings?: Array<{ code: string; message: string }>): ViewState<T> {
  return { status: "success", data, warnings };
}

export function errorState<T>(error: { code: string; message: string; recoverable: boolean }, data?: T): ViewState<T> {
  return { status: "error", error, data };
}
