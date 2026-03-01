export interface CharacterSpec {
  glyphId: string;
  glyphName: string;
  codePoint?: number;
  kind: "base" | "mark" | "ligature" | "space";
}

export interface TemplateCharacterSelection {
  includeLatamAlnum: boolean;
  includeCodeChars: boolean;
}

export type TemplateCharacterPreset = "latam-alnum" | "code-dev" | "latam-plus-code";
export type ExportPreset = "minimal-latin" | "freeform";

function cp(cpValue: number): CharacterSpec {
  const char = String.fromCodePoint(cpValue);
  const isAsciiAlnum =
    (cpValue >= 0x30 && cpValue <= 0x39) ||
    (cpValue >= 0x41 && cpValue <= 0x5A) ||
    (cpValue >= 0x61 && cpValue <= 0x7A);

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
  0x00D1, 0x00F1, 0x00C1, 0x00C9, 0x00CD, 0x00D3, 0x00DA, 0x00E1, 0x00E9, 0x00ED, 0x00F3, 0x00FA, 0x00DC, 0x00FC,
  0x00C0, 0x00C2, 0x00C3, 0x00C7, 0x00CA, 0x00D4, 0x00D5, 0x00E0, 0x00E2, 0x00E3, 0x00E7, 0x00EA, 0x00F4, 0x00F5,
].map(cp);

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

export class TemplateCharacterDomainService {
  derivePreset(selection: TemplateCharacterSelection): TemplateCharacterPreset {
    if (selection.includeLatamAlnum && selection.includeCodeChars) {
      return "latam-plus-code";
    }
    if (selection.includeCodeChars) {
      return "code-dev";
    }
    return "latam-alnum";
  }

  buildCharacters(selection: TemplateCharacterSelection): CharacterSpec[] {
    const preset = this.derivePreset(selection);
    if (preset === "latam-alnum") {
      return this.buildLatamAlnumSet();
    }
    if (preset === "code-dev") {
      return this.buildCodeDevSet();
    }
    return dedupeByCodePointOrName([...this.buildCodeDevSet(), ...this.buildLatamAlnumSet()]);
  }

  requiredGlyphNamesForExportPreset(preset: ExportPreset): string[] {
    if (preset === "freeform") {
      return [".notdef"];
    }

    return [
      ".notdef",
      "space",
      ...range(0x41, 0x5A).map((x) => x.glyphName),
      ...range(0x61, 0x7A).map((x) => x.glyphName),
      ...range(0x30, 0x39).map((x) => x.glyphName),
    ];
  }

  private buildLatamAlnumSet(): CharacterSpec[] {
    return [
      BASE_NOTDEF,
      BASE_SPACE,
      ...range(0x41, 0x5A),
      ...range(0x61, 0x7A),
      ...range(0x30, 0x39),
      ...LATAM_EXTRA,
    ];
  }

  private buildCodeDevSet(): CharacterSpec[] {
    return [
      BASE_NOTDEF,
      ...range(0x20, 0x7E),
    ];
  }
}

