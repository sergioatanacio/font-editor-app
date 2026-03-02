import {
  deriveTemplateCharacterPreset as derivePresetFromDomain,
  isTemplateCharacterSelectionValid,
} from "../../../slices/template/characterCatalog";

export interface CharacterSetChecksModel {
  includeLatamAlnum: boolean;
  includeCodeChars: boolean;
}

export function deriveTemplateCharacterPreset(checks: CharacterSetChecksModel): "latam-alnum" | "code-dev" | "latam-plus-code" {
  return derivePresetFromDomain(checks);
}

export function isCharacterSelectionValid(checks: CharacterSetChecksModel): boolean {
  return isTemplateCharacterSelectionValid(checks);
}
