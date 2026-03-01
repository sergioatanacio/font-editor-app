import { ExportReadinessDomainService, type ExportReadinessIssue } from "../../../domain/services";
import type { Typeface } from "../../../domain/entities/Typeface";
import type { ExportReadinessResult, ExportReadinessStrategy } from "./ExportReadinessStrategy";

const domainService = new ExportReadinessDomainService();

export class FreeformReadinessStrategy implements ExportReadinessStrategy {
  readonly preset = "freeform" as const;

  validate(typeface: Typeface): ExportReadinessResult {
    const report = domainService.validate(typeface, this.preset);
    return {
      errors: report.errors as ExportReadinessIssue[],
      warnings: report.warnings as ExportReadinessIssue[],
    };
  }
}

