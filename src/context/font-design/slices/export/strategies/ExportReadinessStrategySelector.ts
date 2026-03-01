import { FreeformReadinessStrategy } from "./FreeformReadinessStrategy";
import { MinimalLatinReadinessStrategy } from "./MinimalLatinReadinessStrategy";
import type { ExportReadinessPreset, ExportReadinessStrategy } from "./ExportReadinessStrategy";

const STRATEGIES: Record<ExportReadinessPreset, ExportReadinessStrategy> = {
  "minimal-latin": new MinimalLatinReadinessStrategy(),
  "freeform": new FreeformReadinessStrategy(),
};

export class ExportReadinessStrategySelector {
  byPreset(preset: ExportReadinessPreset): ExportReadinessStrategy {
    return STRATEGIES[preset];
  }
}

