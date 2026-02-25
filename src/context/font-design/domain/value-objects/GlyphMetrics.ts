import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export interface GlyphMetricsInput {
  advanceWidth: number;
  leftSideBearing: number;
}

export class GlyphMetrics {
  private constructor(
    readonly advanceWidth: number,
    readonly leftSideBearing: number,
  ) {}

  static create(input: GlyphMetricsInput): Result<GlyphMetrics, DomainError> {
    if (!Number.isFinite(input.advanceWidth) || input.advanceWidth < 0) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_GLYPH_METRICS",
          message: "advanceWidth debe ser finito y >= 0.",
        }),
      };
    }

    if (!Number.isFinite(input.leftSideBearing)) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_GLYPH_METRICS",
          message: "leftSideBearing debe ser finito.",
        }),
      };
    }

    return {
      ok: true,
      value: new GlyphMetrics(input.advanceWidth, input.leftSideBearing),
    };
  }
}
