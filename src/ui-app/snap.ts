export interface SnapConfig {
  baseline: boolean;
  grid: boolean;
  gridSize: number;
  baselineTolerance?: number;
}

export function snapValue(value: number, config: SnapConfig): number {
  let next = value;
  const tolerance = config.baselineTolerance ?? 12;
  if (config.baseline && Math.abs(next) <= tolerance) {
    next = 0;
  }
  if (config.grid) {
    const step = Math.max(1, Math.min(200, Math.round(config.gridSize)));
    next = Math.round(next / step) * step;
  }
  return next;
}

export function snapScale(scale: number): number {
  const clamped = Math.max(0.1, Math.min(8, scale));
  return Math.round(clamped * 1000) / 1000;
}

