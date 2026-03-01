import { TemplateCharacterDomainService, type CharacterSpec } from "../../../domain/services";
import type { TemplateCharacterSelection, TemplateCharacterStrategy } from "./TemplateCharacterStrategy";

const domainService = new TemplateCharacterDomainService();

export class CodeDevCharacterStrategy implements TemplateCharacterStrategy {
  readonly preset = "code-dev" as const;

  buildCharacters(_selection: TemplateCharacterSelection): CharacterSpec[] {
    return domainService.buildCharacters({ includeLatamAlnum: false, includeCodeChars: true });
  }
}

