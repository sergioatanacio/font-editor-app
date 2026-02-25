export type ErrorLayer = "domain" | "application" | "infrastructure";
export type ErrorSeverity = "error" | "warning";

export interface AppError {
  readonly code: string;
  readonly layer: ErrorLayer;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly recoverable: boolean;
  readonly context?: Readonly<Record<string, unknown>>;
}
