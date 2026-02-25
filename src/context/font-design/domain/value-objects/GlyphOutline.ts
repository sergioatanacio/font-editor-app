import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export type PathCommandType = "M" | "L" | "Q" | "C" | "Z";

export interface PathCommand {
  type: PathCommandType;
  values: readonly number[];
}

export type Contour = readonly PathCommand[];

export class GlyphOutline {
  private constructor(readonly contours: readonly Contour[]) {}

  static empty(): GlyphOutline {
    return new GlyphOutline([]);
  }

  static create(contours: readonly Contour[]): Result<GlyphOutline, DomainError> {
    for (const contour of contours) {
      if (!contour.length) {
        return {
          ok: false,
          error: new DomainError({
            code: "INVALID_GLYPH_OUTLINE",
            message: "Contour no puede ser vacio.",
          }),
        };
      }

      const last = contour[contour.length - 1];
      if (last.type !== "Z") {
        return {
          ok: false,
          error: new DomainError({
            code: "INVALID_GLYPH_OUTLINE",
            message: "Cada contour debe cerrar con Z.",
          }),
        };
      }

      for (const cmd of contour) {
        for (const value of cmd.values) {
          if (!Number.isFinite(value)) {
            return {
              ok: false,
              error: new DomainError({
                code: "INVALID_GLYPH_OUTLINE",
                message: "Outline contiene coordenadas no finitas.",
              }),
            };
          }
        }
      }
    }

    return { ok: true, value: new GlyphOutline(contours) };
  }

  hasContours(): boolean {
    return this.contours.length > 0;
  }
}
