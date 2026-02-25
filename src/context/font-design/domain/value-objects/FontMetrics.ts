import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export interface FontMetricsInput {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  baseline?: number;
}

export class FontMetrics {
  private constructor(
    readonly unitsPerEm: number,
    readonly ascender: number,
    readonly descender: number,
    readonly lineGap: number,
    readonly baseline: number,
  ) {}

  static create(input: FontMetricsInput): Result<FontMetrics, DomainError> {
    const baseline = input.baseline ?? 0;

    if (!Number.isInteger(input.unitsPerEm) || input.unitsPerEm < 16 || input.unitsPerEm > 16384) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_FONT_METRICS",
          message: "unitsPerEm debe ser entero entre 16 y 16384.",
        }),
      };
    }

    if (!Number.isFinite(input.ascender) || input.ascender <= 0) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_FONT_METRICS",
          message: "ascender debe ser > 0.",
        }),
      };
    }

    if (!Number.isFinite(input.descender) || input.descender > 0) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_FONT_METRICS",
          message: "descender debe ser <= 0.",
        }),
      };
    }

    if (!Number.isFinite(input.lineGap) || input.lineGap < 0) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_FONT_METRICS",
          message: "lineGap debe ser >= 0.",
        }),
      };
    }

    if (baseline !== 0) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_FONT_METRICS",
          message: "baseline debe ser 0 en v1.",
        }),
      };
    }

    return {
      ok: true,
      value: new FontMetrics(input.unitsPerEm, input.ascender, input.descender, input.lineGap, baseline),
    };
  }
}
