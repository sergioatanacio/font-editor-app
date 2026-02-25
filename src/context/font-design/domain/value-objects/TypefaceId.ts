import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export class TypefaceId {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<TypefaceId, DomainError> {
    const value = raw.trim();
    if (!value) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_TYPEFACE_ID",
          message: "TypefaceId no puede estar vacio.",
        }),
      };
    }
    return { ok: true, value: new TypefaceId(value) };
  }

  toString(): string {
    return this.value;
  }
}
