import { TemplateCharacterDomainService, type TemplateCharacterPreset, type TemplateCharacterSelection, type CharacterSpec } from "../../../domain/services";
import type { TemplateCharacterStrategy } from "./TemplateCharacterStrategy";

const domainService = new TemplateCharacterDomainService();

class DomainBackedTemplateCharacterStrategy implements TemplateCharacterStrategy {
  constructor(readonly preset: TemplateCharacterPreset) {}

  buildCharacters(_selection: TemplateCharacterSelection): CharacterSpec[] {
    if (this.preset === "latam-alnum") {
      return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: false });
    }
    if (this.preset === "code-dev") {
      return domainService.buildCharacters({ includeLatamAlnum: false, includeCodeChars: true });
    }
    return domainService.buildCharacters({ includeLatamAlnum: true, includeCodeChars: true });
  }
}

const STRATEGIES: Record<TemplateCharacterPreset, TemplateCharacterStrategy> = {
  "latam-alnum": new DomainBackedTemplateCharacterStrategy("latam-alnum"),
  "code-dev": new DomainBackedTemplateCharacterStrategy("code-dev"),
  "latam-plus-code": new DomainBackedTemplateCharacterStrategy("latam-plus-code"),
};

export function deriveTemplateCharacterPreset(selection: TemplateCharacterSelection): TemplateCharacterPreset {
  return domainService.derivePreset(selection);
}

export class TemplateCharacterStrategySelector {
  byPreset(preset: TemplateCharacterPreset): TemplateCharacterStrategy {
    return STRATEGIES[preset];
  }

  bySelection(selection: TemplateCharacterSelection): TemplateCharacterStrategy {
    return this.byPreset(deriveTemplateCharacterPreset(selection));
  }
}

