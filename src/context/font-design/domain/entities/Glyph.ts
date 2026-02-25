import { DomainError } from "../errors/DomainError";
import { GlyphId } from "../value-objects/GlyphId";
import { GlyphMetrics } from "../value-objects/GlyphMetrics";
import { GlyphName } from "../value-objects/GlyphName";
import { GlyphOutline } from "../value-objects/GlyphOutline";
import { UnicodeCodePoint } from "../value-objects/UnicodeCodePoint";
import type { Result } from "../../shared/result/Result";

export type GlyphKind = "base" | "mark" | "ligature" | "space";
export type GlyphStatus = "empty" | "outlined";

export interface GlyphCreateInput {
  id: GlyphId;
  name: GlyphName;
  kind: GlyphKind;
  metrics: GlyphMetrics;
  outline?: GlyphOutline;
  unicode?: UnicodeCodePoint;
}

export class Glyph {
  private constructor(
    readonly id: GlyphId,
    readonly name: GlyphName,
    readonly kind: GlyphKind,
    readonly metrics: GlyphMetrics,
    readonly outline: GlyphOutline,
    readonly unicode?: UnicodeCodePoint,
  ) {}

  static create(input: GlyphCreateInput): Result<Glyph, DomainError> {
    const outline = input.outline ?? GlyphOutline.empty();
    return { ok: true, value: new Glyph(input.id, input.name, input.kind, input.metrics, outline, input.unicode) };
  }

  get status(): GlyphStatus {
    return this.outline.hasContours() ? "outlined" : "empty";
  }

  replaceOutline(outline: GlyphOutline): Glyph {
    return new Glyph(this.id, this.name, this.kind, this.metrics, outline, this.unicode);
  }

  clearOutline(): Glyph {
    return new Glyph(this.id, this.name, this.kind, this.metrics, GlyphOutline.empty(), this.unicode);
  }

  assignUnicode(codePoint: UnicodeCodePoint): Glyph {
    return new Glyph(this.id, this.name, this.kind, this.metrics, this.outline, codePoint);
  }

  removeUnicode(): Glyph {
    return new Glyph(this.id, this.name, this.kind, this.metrics, this.outline, undefined);
  }

  changeMetrics(metrics: GlyphMetrics): Glyph {
    return new Glyph(this.id, this.name, this.kind, metrics, this.outline, this.unicode);
  }

  rename(name: GlyphName): Glyph {
    return new Glyph(this.id, name, this.kind, this.metrics, this.outline, this.unicode);
  }

  changeKind(kind: GlyphKind): Glyph {
    return new Glyph(this.id, this.name, kind, this.metrics, this.outline, this.unicode);
  }
}
