import { TemplateCharacterDomainService, type CharacterSpec } from "../../../domain/services";
import type { TemplateCharacterSelection, TemplateCharacterStrategy } from "./TemplateCharacterStrategy";

const domainService = new TemplateCharacterDomainService();

export class LatamPlusCodeCharacterStrategy implements TemplateCharacterStrategy {
  readonly preset = "latam-plus-code" as const;

  buildCharacters(_selection: TemplateCharacterSelection): CharacterSpec[] {
    return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: true });
  }
}

