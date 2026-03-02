import type { GlyphOutlineSnapshot, GlyphSnapshot, TypefaceSnapshot } from "../context/font-design/domain/ports";

export interface SpecimenItem {
  runIndex: number;
  glyphId: string;
  codePoint: number;
  char: string;
  x: number;
  baselineY: number;
  advanceWidth: number;
  outline: GlyphOutlineSnapshot;
}

export interface SpecimenLayout {
  items: SpecimenItem[];
  width: number;
  height: number;
  ascender: number;
  descender: number;
  unitsPerEm: number;
}

function glyphByUnicode(typeface: TypefaceSnapshot): Map<number, GlyphSnapshot> {
  const map = new Map<number, GlyphSnapshot>();
  for (const glyph of typeface.glyphs) {
    if (glyph.unicodeCodePoint == null) continue;
    if (!map.has(glyph.unicodeCodePoint)) {
      map.set(glyph.unicodeCodePoint, glyph);
    }
  }
  return map;
}

function fallbackGlyph(typeface: TypefaceSnapshot): GlyphSnapshot | null {
  return typeface.glyphs.find((x) => x.name === ".notdef")
    ?? typeface.glyphs.find((x) => x.unicodeCodePoint === 0x3f)
    ?? typeface.glyphs[0]
    ?? null;
}

function resolveGlyph(typeface: TypefaceSnapshot, cp: number, unicodeMap: Map<number, GlyphSnapshot>): GlyphSnapshot | null {
  return unicodeMap.get(cp) ?? fallbackGlyph(typeface);
}

export function layoutSpecimen(typeface: TypefaceSnapshot, text: string): SpecimenLayout {
  const unicodeMap = glyphByUnicode(typeface);
  const unitsPerEm = typeface.metrics.unitsPerEm;
  const ascender = typeface.metrics.ascender;
  const descender = typeface.metrics.descender;
  const lineHeight = typeface.metrics.ascender - typeface.metrics.descender + typeface.metrics.lineGap;
  const startX = Math.round(unitsPerEm * 0.08);
  const baselineTop = Math.round(unitsPerEm * 0.12);

  const chars = Array.from(text.length ? text : "A");
  const items: SpecimenItem[] = [];
  let x = startX;
  let y = baselineTop + ascender;
  let runIndex = 0;
  let maxLineWidth = 0;

  for (const ch of chars) {
    if (ch === "\n") {
      maxLineWidth = Math.max(maxLineWidth, x);
      x = startX;
      y += lineHeight;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0x3f;
    const glyph = resolveGlyph(typeface, cp, unicodeMap);
    if (!glyph) continue;
    const advanceWidth = Math.max(1, Math.round(glyph.metrics.advanceWidth));
    items.push({
      runIndex,
      glyphId: glyph.id,
      codePoint: cp,
      char: ch,
      x: x + glyph.metrics.leftSideBearing,
      baselineY: y,
      advanceWidth,
      outline: glyph.outline,
    });
    x += advanceWidth;
    runIndex += 1;
  }

  maxLineWidth = Math.max(maxLineWidth, x);
  const lines = Math.max(1, text.split("\n").length);
  const height = baselineTop + ascender + Math.max(1, lines - 1) * lineHeight - descender + Math.round(unitsPerEm * 0.18);
  return {
    items,
    width: Math.max(Math.round(unitsPerEm * 0.5), maxLineWidth + Math.round(unitsPerEm * 0.08)),
    height: Math.max(Math.round(unitsPerEm * 0.8), height),
    ascender,
    descender,
    unitsPerEm,
  };
}

export function outlineBounds(outline: GlyphOutlineSnapshot): { xMin: number; yMin: number; xMax: number; yMax: number } | null {
  let xMin = Number.POSITIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;
  let hasPoint = false;
  for (const contour of outline.contours) {
    for (const cmd of contour) {
      for (let i = 0; i + 1 < cmd.values.length; i += 2) {
        const x = cmd.values[i];
        const y = cmd.values[i + 1];
        hasPoint = true;
        if (x < xMin) xMin = x;
        if (y < yMin) yMin = y;
        if (x > xMax) xMax = x;
        if (y > yMax) yMax = y;
      }
    }
  }
  if (!hasPoint) return null;
  return { xMin, yMin, xMax, yMax };
}

