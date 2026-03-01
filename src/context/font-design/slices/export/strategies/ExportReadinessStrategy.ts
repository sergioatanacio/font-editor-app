import type { Typeface } from "../../../domain/entities/Typeface";
import type { ExportPreset, ExportReadinessIssue } from "../../../domain/services";

export type ReadinessIssue = ExportReadinessIssue;
export type ExportReadinessPreset = ExportPreset;

export interface ExportReadinessResult {
  errors: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

export interface ExportReadinessStrategy {
  readonly preset: ExportReadinessPreset;
  validate(typeface: Typeface): ExportReadinessResult;
}

