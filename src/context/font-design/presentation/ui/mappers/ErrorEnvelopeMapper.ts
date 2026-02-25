import type { AppError } from "../../../shared/errors/AppError";

export function mapErrorToEnvelope(error: AppError): {
  code: string;
  message: string;
  recoverable: boolean;
  severity: "error" | "warning";
  layer: "domain" | "application" | "infrastructure";
} {
  return {
    code: error.code,
    message: error.message,
    recoverable: error.recoverable,
    severity: error.severity,
    layer: error.layer,
  };
}
