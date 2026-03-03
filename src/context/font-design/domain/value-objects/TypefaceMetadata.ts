import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export interface TypefaceMetadataInput {
  familyName: string;
  styleName: string;
  designer?: string;
  version?: string;
  letterSpacing?: number;
  kerningPairs?: Record<string, number>;
}

export class TypefaceMetadata {
  private constructor(
    readonly familyName: string,
    readonly styleName: string,
    readonly designer?: string,
    readonly version?: string,
    readonly letterSpacing = 0,
    readonly kerningPairs: Readonly<Record<string, number>> = {},
  ) {}

  static create(input: TypefaceMetadataInput): Result<TypefaceMetadata, DomainError> {
    const familyName = input.familyName.trim();
    const styleName = input.styleName.trim();

    if (!familyName || !styleName) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_TYPEFACE_METADATA",
          message: "familyName y styleName son obligatorios.",
        }),
      };
    }

    const rawLetterSpacing = input.letterSpacing ?? 0;
    if (!Number.isFinite(rawLetterSpacing)) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_TYPEFACE_METADATA",
          message: "letterSpacing debe ser un numero finito.",
        }),
      };
    }
    const letterSpacing = Math.max(-1000, Math.min(1000, Math.round(rawLetterSpacing)));
    const rawKerningPairs = input.kerningPairs ?? {};
    if (typeof rawKerningPairs !== "object" || Array.isArray(rawKerningPairs)) {
      return {
        ok: false,
        error: new DomainError({
          code: "INVALID_TYPEFACE_METADATA",
          message: "kerningPairs debe ser un objeto key/value.",
        }),
      };
    }

    const kerningPairs: Record<string, number> = {};
    for (const [key, rawValue] of Object.entries(rawKerningPairs)) {
      const pairKey = key.trim();
      if (!pairKey) {
        return {
          ok: false,
          error: new DomainError({
            code: "INVALID_TYPEFACE_METADATA",
            message: "kerningPairs contiene una clave vacia.",
          }),
        };
      }
      if (!Number.isFinite(rawValue)) {
        return {
          ok: false,
          error: new DomainError({
            code: "INVALID_TYPEFACE_METADATA",
            message: "Todos los valores de kerningPairs deben ser numeros finitos.",
          }),
        };
      }
      const value = Math.max(-1000, Math.min(1000, Math.round(rawValue)));
      if (value !== 0) {
        kerningPairs[pairKey] = value;
      }
    }

    return {
      ok: true,
      value: new TypefaceMetadata(
        familyName,
        styleName,
        input.designer?.trim() || undefined,
        input.version?.trim() || undefined,
        letterSpacing,
        kerningPairs,
      ),
    };
  }
}
