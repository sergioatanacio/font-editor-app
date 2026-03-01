import { ExportReadinessDomainService, type ExportReadinessIssue } from "../../../domain/services";
import type { Typeface } from "../../../domain/entities/Typeface";

const domainService = new ExportReadinessDomainService();

export function validateWithRequiredGlyphNames(typeface: Typeface, requiredGlyphNames: readonly string[]): {
  errors: ExportReadinessIssue[];
  warnings: ExportReadinessIssue[];
} {
  const preset = requiredGlyphNames.length === 1 && requiredGlyphNames[0] === ".notdef"
    ? "freeform"
    : "minimal-latin";

  const report = domainService.validate(typeface, preset);
  return {
    errors: report.errors,
    warnings: report.warnings,
  };
}

