import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export class GlyphName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<GlyphName, DomainError> {
    const value = raw.trim();
    if (!value) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_GLYPH_NAME",
          message: "GlyphName no puede estar vacio.",
        }),
      };
    }
    return { ok: true, value: new GlyphName(value) };
  }

  toString(): string {
    return this.value;
  }
}
