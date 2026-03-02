import {
  TemplateCharacterDomainService,
  type CharacterSpec,
  type TemplateCharacterSelection,
  type TemplateCharacterPreset,
  type ExportPreset,
} from "../../domain/services";

const service = new TemplateCharacterDomainService();

export type { CharacterSpec };

export function deriveTemplateCharacterPreset(selection: TemplateCharacterSelection): TemplateCharacterPreset {
  return service.derivePreset(selection);
}

export function isTemplateCharacterSelectionValid(selection: TemplateCharacterSelection): boolean {
  return service.isSelectionValid(selection);
}

export function buildTemplateCharacters(selection: TemplateCharacterSelection): CharacterSpec[] {
  return service.buildCharacters(selection);
}

export function requiredGlyphNamesForExportPreset(preset: ExportPreset): string[] {
  return service.requiredGlyphNamesForExportPreset(preset);
}
