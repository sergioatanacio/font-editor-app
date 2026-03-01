import { TemplateCharacterDomainService, type CharacterSpec } from "../../../domain/services";
import type { TemplateCharacterSelection, TemplateCharacterStrategy } from "./TemplateCharacterStrategy";

const domainService = new TemplateCharacterDomainService();

export class LatamAlnumCharacterStrategy implements TemplateCharacterStrategy {
  readonly preset = "latam-alnum" as const;

  buildCharacters(_selection: TemplateCharacterSelection): CharacterSpec[] {
    return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: false });
  }
}

