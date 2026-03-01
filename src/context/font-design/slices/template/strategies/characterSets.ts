import { TemplateCharacterDomainService, type CharacterSpec } from "../../../domain/services";

const domainService = new TemplateCharacterDomainService();

export function buildLatamAlnumCharacters(): CharacterSpec[] {
  return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: false });
}

export function buildCodeDevCharacters(): CharacterSpec[] {
  return domainService.buildCharacters({ includeLatamAlnum: false, includeCodeChars: true });
}

export function buildLatamPlusCodeCharacters(): CharacterSpec[] {
  return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: true });
}

