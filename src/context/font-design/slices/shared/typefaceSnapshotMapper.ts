import { Glyph } from "../../domain/entities/Glyph";
import { Typeface } from "../../domain/entities/Typeface";
import { DomainError } from "../../domain/errors/DomainError";
import type {
  GlyphOutlineSnapshot,
  GlyphSnapshot,
  TypefaceSnapshot,
} from "../../domain/ports";
import { FontMetrics } from "../../domain/value-objects/FontMetrics";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphMetrics } from "../../domain/value-objects/GlyphMetrics";
import { GlyphName } from "../../domain/value-objects/GlyphName";
import { GlyphOutline } from "../../domain/value-objects/GlyphOutline";
import { TypefaceId } from "../../domain/value-objects/TypefaceId";
import { TypefaceMetadata } from "../../domain/value-objects/TypefaceMetadata";
import { UnicodeCodePoint } from "../../domain/value-objects/UnicodeCodePoint";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";

function fromDomainError(error: DomainError): AppError {
  return {
    code: error.code,
    message: error.message,
    context: error.context,
    layer: "domain",
    severity: "error",
    recoverable: false,
  };
}

function appError(code: string, message: string, context?: Record<string, unknown>): AppError {
  return {
    code,
    message,
    context,
    layer: "application",
    severity: "error",
    recoverable: false,
  };
}

function ensure<T>(result: Result<T, DomainError>): Result<T, AppError> {
  if (!result.ok) {
    return { ok: false, error: fromDomainError(result.error) };
  }
  return { ok: true, value: result.value };
}

function toDomainGlyphOutline(snapshot: GlyphOutlineSnapshot): Result<GlyphOutline, AppError> {
  const outline = GlyphOutline.create(
    snapshot.contours.map((contour) =>
      contour.map((command) => ({ type: command.type, values: command.values })),
    ),
  );
  return ensure(outline);
}

function toDomainGlyph(snapshot: GlyphSnapshot): Result<Glyph, AppError> {
  const id = ensure(GlyphId.create(snapshot.id));
  if (!id.ok) return id;

  const name = ensure(GlyphName.create(snapshot.name));
  if (!name.ok) return name;

  const metrics = ensure(
    GlyphMetrics.create({
      advanceWidth: snapshot.metrics.advanceWidth,
      leftSideBearing: snapshot.metrics.leftSideBearing,
    }),
  );
  if (!metrics.ok) return metrics;

  const outline = toDomainGlyphOutline(snapshot.outline);
  if (!outline.ok) return outline;

  const unicode = snapshot.unicodeCodePoint == null ? undefined : ensure(UnicodeCodePoint.create(snapshot.unicodeCodePoint));
  if (unicode && !unicode.ok) return unicode;

  const glyph = Glyph.create({
    id: id.value,
    name: name.value,
    kind: snapshot.kind,
    metrics: metrics.value,
    outline: outline.value,
    unicode: unicode?.ok ? unicode.value : undefined,
  });
  return ensure(glyph);
}

export function toDomainTypeface(snapshot: TypefaceSnapshot): Result<Typeface, AppError> {
  const id = ensure(TypefaceId.create(snapshot.id));
  if (!id.ok) return id;

  const metadata = ensure(
    TypefaceMetadata.create({
      familyName: snapshot.metadata.familyName,
      styleName: snapshot.metadata.styleName,
      designer: snapshot.metadata.designer,
      version: snapshot.metadata.version,
      letterSpacing: snapshot.metadata.letterSpacing,
      kerningPairs: snapshot.metadata.kerningPairs,
    }),
  );
  if (!metadata.ok) return metadata;

  const metrics = ensure(
    FontMetrics.create({
      unitsPerEm: snapshot.metrics.unitsPerEm,
      ascender: snapshot.metrics.ascender,
      descender: snapshot.metrics.descender,
      lineGap: snapshot.metrics.lineGap,
      baseline: snapshot.metrics.baseline,
    }),
  );
  if (!metrics.ok) return metrics;

  const glyphs: Glyph[] = [];
  for (const glyphSnapshot of snapshot.glyphs) {
    const glyph = toDomainGlyph(glyphSnapshot);
    if (!glyph.ok) return glyph;
    glyphs.push(glyph.value);
  }

  const typeface = Typeface.create({
    id: id.value,
    metadata: metadata.value,
    metrics: metrics.value,
    glyphs,
  });
  return ensure(typeface);
}

export function toTypefaceSnapshot(typeface: Typeface): TypefaceSnapshot {
  const kerningPairs = { ...typeface.metadata.kerningPairs };
  const hasKerningPairs = Object.keys(kerningPairs).length > 0;
  return {
    id: typeface.id.toString(),
    metadata: {
      familyName: typeface.metadata.familyName,
      styleName: typeface.metadata.styleName,
      designer: typeface.metadata.designer,
      version: typeface.metadata.version,
      letterSpacing: typeface.metadata.letterSpacing,
      kerningPairs: hasKerningPairs ? kerningPairs : undefined,
    },
    metrics: {
      unitsPerEm: typeface.metrics.unitsPerEm,
      ascender: typeface.metrics.ascender,
      descender: typeface.metrics.descender,
      lineGap: typeface.metrics.lineGap,
      baseline: typeface.metrics.baseline,
    },
    glyphs: Array.from(typeface.glyphs.values()).map((glyph) => ({
      id: glyph.id.toString(),
      name: glyph.name.toString(),
      kind: glyph.kind,
      metrics: {
        advanceWidth: glyph.metrics.advanceWidth,
        leftSideBearing: glyph.metrics.leftSideBearing,
      },
      outline: {
        contours: glyph.outline.contours.map((contour) =>
          contour.map((command) => ({ type: command.type, values: [...command.values] })),
        ),
      },
      unicodeCodePoint: glyph.unicode?.toNumber(),
    })),
  };
}

export function requireTypefaceSnapshot(raw: unknown): Result<TypefaceSnapshot, AppError> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: appError("INVALID_PROJECT_SNAPSHOT", "El snapshot no contiene typeface valido.") };
  }

  const candidate = raw as Partial<TypefaceSnapshot>;
  if (typeof candidate.id !== "string" || !candidate.metadata || !candidate.metrics || !Array.isArray(candidate.glyphs)) {
    return { ok: false, error: appError("INVALID_PROJECT_SNAPSHOT", "El snapshot de typeface tiene forma invalida.") };
  }

  return { ok: true, value: candidate as TypefaceSnapshot };
}
