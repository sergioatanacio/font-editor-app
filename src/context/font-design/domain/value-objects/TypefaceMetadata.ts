import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";

export interface TypefaceMetadataInput {
  familyName: string;
  styleName: string;
  designer?: string;
  version?: string;
}

export class TypefaceMetadata {
  private constructor(
    readonly familyName: string,
    readonly styleName: string,
    readonly designer?: string,
    readonly version?: string,
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

    return {
      ok: true,
      value: new TypefaceMetadata(
        familyName,
        styleName,
        input.designer?.trim() || undefined,
        input.version?.trim() || undefined,
      ),
    };
  }
}
