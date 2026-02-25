export interface CharacterSetChecksModel {
  includeLatamAlnum: boolean;
  includeCodeChars: boolean;
}

export function deriveTemplateCharacterPreset(checks: CharacterSetChecksModel): "latam-alnum" | "code-dev" | "latam-plus-code" {
  if (checks.includeLatamAlnum && checks.includeCodeChars) {
    return "latam-plus-code";
  }
  if (checks.includeCodeChars) {
    return "code-dev";
  }
  return "latam-alnum";
}

export function isCharacterSelectionValid(checks: CharacterSetChecksModel): boolean {
  return checks.includeLatamAlnum || checks.includeCodeChars;
}
