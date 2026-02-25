import type { Result } from "../../shared/result/Result";
import { DomainError } from "../errors/DomainError";
import { Glyph } from "./Glyph";
import { GlyphId } from "../value-objects/GlyphId";
import { UnicodeCodePoint } from "../value-objects/UnicodeCodePoint";
import { GlyphOutline } from "../value-objects/GlyphOutline";
import { GlyphMetrics } from "../value-objects/GlyphMetrics";
import { TypefaceMetadata } from "../value-objects/TypefaceMetadata";
import { FontMetrics } from "../value-objects/FontMetrics";
import { TypefaceId } from "../value-objects/TypefaceId";

export interface TypefaceCreateInput {
  id: TypefaceId;
  metadata: TypefaceMetadata;
  metrics: FontMetrics;
  glyphs?: readonly Glyph[];
}

export class Typeface {
  private constructor(
    readonly id: TypefaceId,
    readonly metadata: TypefaceMetadata,
    readonly metrics: FontMetrics,
    readonly glyphs: ReadonlyMap<string, Glyph>,
  ) {}

  static create(input: TypefaceCreateInput): Result<Typeface, DomainError> {
    const map = new Map<string, Glyph>();

    for (const glyph of input.glyphs ?? []) {
      const key = glyph.id.toString();
      if (map.has(key)) {
        return {
          ok: false,
          error: new DomainError({
            code: "DUPLICATE_GLYPH_ID",
            message: "No se permite GlyphId duplicado.",
          }),
        };
      }
      map.set(key, glyph);
    }

    const instance = new Typeface(input.id, input.metadata, input.metrics, map);
    const validation = instance.validateInternalConsistency();
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    return { ok: true, value: instance };
  }

  addGlyph(glyph: Glyph): Result<Typeface, DomainError> {
    const key = glyph.id.toString();
    if (this.glyphs.has(key)) {
      return {
        ok: false,
        error: new DomainError({
          code: "DUPLICATE_GLYPH_ID",
          message: "No se permite GlyphId duplicado.",
        }),
      };
    }

    const next = new Map(this.glyphs);
    next.set(key, glyph);
    const candidate = new Typeface(this.id, this.metadata, this.metrics, next);
    const validation = candidate.validateInternalConsistency();
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    return { ok: true, value: candidate };
  }

  replaceGlyph(glyph: Glyph): Result<Typeface, DomainError> {
    const key = glyph.id.toString();
    if (!this.glyphs.has(key)) {
      return {
        ok: false,
        error: new DomainError({
          code: "GLYPH_NOT_FOUND",
          message: "No se encontro glyph para reemplazo.",
        }),
      };
    }

    const next = new Map(this.glyphs);
    next.set(key, glyph);
    const candidate = new Typeface(this.id, this.metadata, this.metrics, next);
    const validation = candidate.validateInternalConsistency();
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    return { ok: true, value: candidate };
  }

  removeGlyph(glyphId: GlyphId): Result<Typeface, DomainError> {
    const key = glyphId.toString();
    if (!this.glyphs.has(key)) {
      return {
        ok: false,
        error: new DomainError({
          code: "GLYPH_NOT_FOUND",
          message: "No se encontro glyph para eliminar.",
        }),
      };
    }

    const next = new Map(this.glyphs);
    next.delete(key);
    return { ok: true, value: new Typeface(this.id, this.metadata, this.metrics, next) };
  }

  assignUnicode(glyphId: GlyphId, codePoint: UnicodeCodePoint): Result<Typeface, DomainError> {
    const key = glyphId.toString();
    const glyph = this.glyphs.get(key);
    if (!glyph) {
      return {
        ok: false,
        error: new DomainError({ code: "GLYPH_NOT_FOUND", message: "No se encontro glyph." }),
      };
    }

    const updated = glyph.assignUnicode(codePoint);
    const next = new Map(this.glyphs);
    next.set(key, updated);
    const candidate = new Typeface(this.id, this.metadata, this.metrics, next);
    const validation = candidate.validateInternalConsistency();
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    return { ok: true, value: candidate };
  }

  replaceGlyphOutline(glyphId: GlyphId, outline: GlyphOutline): Result<Typeface, DomainError> {
    const key = glyphId.toString();
    const glyph = this.glyphs.get(key);
    if (!glyph) {
      return {
        ok: false,
        error: new DomainError({ code: "GLYPH_NOT_FOUND", message: "No se encontro glyph." }),
      };
    }

    const next = new Map(this.glyphs);
    next.set(key, glyph.replaceOutline(outline));
    return { ok: true, value: new Typeface(this.id, this.metadata, this.metrics, next) };
  }

  changeGlyphMetrics(glyphId: GlyphId, metrics: GlyphMetrics): Result<Typeface, DomainError> {
    const key = glyphId.toString();
    const glyph = this.glyphs.get(key);
    if (!glyph) {
      return {
        ok: false,
        error: new DomainError({ code: "GLYPH_NOT_FOUND", message: "No se encontro glyph." }),
      };
    }

    const next = new Map(this.glyphs);
    next.set(key, glyph.changeMetrics(metrics));
    return { ok: true, value: new Typeface(this.id, this.metadata, this.metrics, next) };
  }

  changeMetadata(metadata: TypefaceMetadata): Typeface {
    return new Typeface(this.id, metadata, this.metrics, this.glyphs);
  }

  changeFontMetrics(metrics: FontMetrics): Typeface {
    return new Typeface(this.id, this.metadata, metrics, this.glyphs);
  }

  validateInternalConsistency(): Result<void, DomainError> {
    const unicodeSet = new Set<number>();

    for (const glyph of this.glyphs.values()) {
      if (!glyph.unicode) {
        continue;
      }

      const code = glyph.unicode.toNumber();
      if (unicodeSet.has(code)) {
        return {
          ok: false,
          error: new DomainError({
            code: "DUPLICATE_UNICODE",
            message: "No se permiten UnicodeCodePoint duplicados.",
          }),
        };
      }

      unicodeSet.add(code);
    }

    return { ok: true, value: undefined };
  }
}
