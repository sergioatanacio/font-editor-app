import type { ErrorLayer, ErrorSeverity } from "../../shared/errors/AppError";

export class DomainError extends Error {
  readonly code: string;
  readonly layer: ErrorLayer = "domain";
  readonly severity: ErrorSeverity;
  readonly recoverable: boolean;
  readonly context?: Readonly<Record<string, unknown>>;

  constructor(params: {
    code: string;
    message: string;
    severity?: ErrorSeverity;
    recoverable?: boolean;
    context?: Readonly<Record<string, unknown>>;
  }) {
    super(params.message);
    this.name = "DomainError";
    this.code = params.code;
    this.severity = params.severity ?? "error";
    this.recoverable = params.recoverable ?? false;
    this.context = params.context;
  }
}
