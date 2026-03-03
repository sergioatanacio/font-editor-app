export const KERNING_PAIR_SEPARATOR = "::";

export function clampKerningValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1000, Math.min(1000, Math.round(value)));
}

export function pairKey(leftGlyphId: string, rightGlyphId: string): string {
  return `${leftGlyphId.trim()}${KERNING_PAIR_SEPARATOR}${rightGlyphId.trim()}`;
}

export function parsePairKey(key: string): { leftGlyphId: string; rightGlyphId: string } | null {
  const [leftGlyphId, rightGlyphId, extra] = key.split(KERNING_PAIR_SEPARATOR);
  if (extra != null) {
    return null;
  }
  if (!leftGlyphId?.trim() || !rightGlyphId?.trim()) {
    return null;
  }
  return {
    leftGlyphId: leftGlyphId.trim(),
    rightGlyphId: rightGlyphId.trim(),
  };
}

export function getPairKerning(kerningPairs: Readonly<Record<string, number>>, leftGlyphId: string, rightGlyphId: string): number {
  const key = pairKey(leftGlyphId, rightGlyphId);
  const value = kerningPairs[key];
  return Number.isFinite(value) ? value : 0;
}

export function setPairKerning(
  kerningPairs: Readonly<Record<string, number>>,
  leftGlyphId: string,
  rightGlyphId: string,
  value: number,
): Record<string, number> {
  const key = pairKey(leftGlyphId, rightGlyphId);
  const next = { ...kerningPairs };
  const normalized = clampKerningValue(value);
  if (normalized === 0) {
    delete next[key];
    return next;
  }
  next[key] = normalized;
  return next;
}

export function removePairKerning(
  kerningPairs: Readonly<Record<string, number>>,
  leftGlyphId: string,
  rightGlyphId: string,
): Record<string, number> {
  const key = pairKey(leftGlyphId, rightGlyphId);
  const next = { ...kerningPairs };
  delete next[key];
  return next;
}
