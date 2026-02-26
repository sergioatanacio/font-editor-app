export interface CharacterSpec {
  glyphId: string;
  glyphName: string;
  codePoint?: number;
  kind: "base" | "mark" | "ligature" | "space";
}

function cp(cpValue: number): CharacterSpec {
  const char = String.fromCodePoint(cpValue);
  const isAsciiAlnum =
    (cpValue >= 0x30 && cpValue <= 0x39) ||
    (cpValue >= 0x41 && cpValue <= 0x5a) ||
    (cpValue >= 0x61 && cpValue <= 0x7a);

  return {
    glyphId: isAsciiAlnum ? char : `u${cpValue.toString(16).toUpperCase().padStart(4, "0")}`,
    glyphName: isAsciiAlnum ? char : `u${cpValue.toString(16).toUpperCase().padStart(4, "0")}`,
    codePoint: cpValue,
    kind: cpValue === 0x20 ? "space" : "base",
  };
}

function range(start: number, end: number): CharacterSpec[] {
  const items: CharacterSpec[] = [];
  for (let value = start; value <= end; value += 1) {
    items.push(cp(value));
  }
  return items;
}

const BASE_NOTDEF: CharacterSpec = {
  glyphId: ".notdef",
  glyphName: ".notdef",
  kind: "base",
};

const BASE_SPACE = cp(0x20);

const LATAM_EXTRA = [
  0x00d1, 0x00f1, 0x00c1, 0x00c9, 0x00cd, 0x00d3, 0x00da, 0x00e1, 0x00e9, 0x00ed, 0x00f3, 0x00fa, 0x00dc, 0x00fc,
  0x00c0, 0x00c2, 0x00c3, 0x00c7, 0x00ca, 0x00d4, 0x00d5, 0x00e0, 0x00e2, 0x00e3, 0x00e7, 0x00ea, 0x00f4, 0x00f5,
].map(cp);

export function deriveTemplateCharacterPreset(selection: {
  includeLatamAlnum: boolean;
  includeCodeChars: boolean;
}): "latam-alnum" | "code-dev" | "latam-plus-code" {
  if (selection.includeLatamAlnum && selection.includeCodeChars) {
    return "latam-plus-code";
  }
  if (selection.includeCodeChars) {
    return "code-dev";
  }
  return "latam-alnum";
}

function latamAlnumSet(): CharacterSpec[] {
  return [
    BASE_NOTDEF,
    BASE_SPACE,
    ...range(0x41, 0x5a),
    ...range(0x61, 0x7a),
    ...range(0x30, 0x39),
    ...LATAM_EXTRA,
  ];
}

function codeDevSet(): CharacterSpec[] {
  return [
    BASE_NOTDEF,
    ...range(0x20, 0x7e),
  ];
}

function dedupeByCodePointOrName(items: CharacterSpec[]): CharacterSpec[] {
  const seen = new Set<string>();
  const output: CharacterSpec[] = [];
  for (const item of items) {
    const key = item.codePoint == null ? `name:${item.glyphName}` : `cp:${item.codePoint}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

export function buildTemplateCharacters(selection: {
  includeLatamAlnum: boolean;
  includeCodeChars: boolean;
}): CharacterSpec[] {
  const preset = deriveTemplateCharacterPreset(selection);
  if (preset === "latam-alnum") {
    return latamAlnumSet();
  }
  if (preset === "code-dev") {
    return codeDevSet();
  }

  return dedupeByCodePointOrName([...codeDevSet(), ...latamAlnumSet()]);
}

export function requiredGlyphNamesForExportPreset(preset: "minimal-latin" | "freeform"): string[] {
  if (preset === "freeform") {
    return [".notdef"];
  }

  return [
    ".notdef",
    "space",
    ...range(0x41, 0x5a).map((x) => x.glyphName),
    ...range(0x61, 0x7a).map((x) => x.glyphName),
    ...range(0x30, 0x39).map((x) => x.glyphName),
  ];
}
