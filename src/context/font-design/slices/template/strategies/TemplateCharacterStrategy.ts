import type { CharacterSpec, TemplateCharacterPreset, TemplateCharacterSelection } from "../../../domain/services";

export type { CharacterSpec, TemplateCharacterSelection, TemplateCharacterPreset };

export interface TemplateCharacterStrategy {
  readonly preset: TemplateCharacterPreset;
  buildCharacters(selection: TemplateCharacterSelection): CharacterSpec[];
}

