import type { ImportSummary } from "../../../domain/ports";

export interface ImportSummaryPanelModel {
  total: number;
  ok: number;
  warning: number;
  error: number;
  empty: number;
  blockingCount: number;
  isBlocking: boolean;
}

export function toImportSummaryPanelModel(summary: ImportSummary): ImportSummaryPanelModel {
  return {
    total: summary.total,
    ok: summary.ok,
    warning: summary.warning,
    error: summary.error,
    empty: summary.empty,
    blockingCount: summary.blockingCount,
    isBlocking: summary.blockingCount > 0,
  };
}
