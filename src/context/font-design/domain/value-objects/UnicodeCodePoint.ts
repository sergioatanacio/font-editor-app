import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export class UnicodeCodePoint {
  private constructor(private readonly value: number) {}

  static create(raw: number): Result<UnicodeCodePoint, DomainError> {
    if (!Number.isInteger(raw) || raw < 0 || raw > 0x10ffff) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_UNICODE_CODEPOINT",
          message: "UnicodeCodePoint fuera de rango valido.",
        }),
      };
    }
    return { ok: true, value: new UnicodeCodePoint(raw) };
  }

  toNumber(): number {
    return this.value;
  }
}
