import type { Glyph } from "../../entities/Glyph";
import type { Typeface } from "../../entities/Typeface";
import { TemplateCharacterDomainService, type ExportPreset } from "../template/TemplateCharacterDomainService";

export interface ExportReadinessIssue {
  code: string;
  message: string;
  glyphId?: string;
}

export interface ExportReadinessReport {
  isReady: boolean;
  errors: ExportReadinessIssue[];
  warnings: ExportReadinessIssue[];
}

function isSpaceGlyph(glyph: Glyph): boolean {
  const name = glyph.name.toString();
  const cp = glyph.unicode?.toNumber();
  return glyph.kind === "space" || name === "space" || name === "u0020" || cp === 0x20;
}

export class ExportReadinessDomainService {
  constructor(
    private readonly templateCharacterDomainService: TemplateCharacterDomainService = new TemplateCharacterDomainService(),
  ) {}

  validate(typeface: Typeface, preset: ExportPreset): ExportReadinessReport {
    const errors: ExportReadinessIssue[] = [];
    const warnings: ExportReadinessIssue[] = [];
    const requiredGlyphNames = this.templateCharacterDomainService.requiredGlyphNamesForExportPreset(preset);

    const glyphs = Array.from(typeface.glyphs.values());
    const byName = new Map(glyphs.map((glyph) => [glyph.name.toString(), glyph]));
    const outlinedNonNotdef = glyphs.filter((glyph) =>
      glyph.name.toString() !== ".notdef" && glyph.outline.hasContours());

    for (const requiredName of requiredGlyphNames) {
      const glyph = requiredName === "space"
        ? (byName.get("space") ?? byName.get("u0020") ?? glyphs.find((x) => isSpaceGlyph(x)))
        : byName.get(requiredName);
      if (!glyph) {
        warnings.push({
          code: "MISSING_PRESET_GLYPH",
          message: `Falta glifo del preset: ${requiredName}. Se exportara como glifo vacio.`,
          glyphId: requiredName,
        });
        continue;
      }

      if (requiredName !== "space" && !glyph.outline.hasContours()) {
        warnings.push({
          code: "EMPTY_REQUIRED_OUTLINE",
          message: `Outline vacio para glifo requerido ${requiredName}.`,
          glyphId: requiredName,
        });
      }
    }

    if (outlinedNonNotdef.length === 0) {
      errors.push({
        code: "NO_OUTLINED_GLYPHS",
        message: "No hay glifos con contorno para exportar.",
      });
    }

    if (outlinedNonNotdef.length < 5) {
      warnings.push({
        code: "LOW_GLYPH_COUNT",
        message: "Cantidad de glifos muy baja para una fuente util.",
      });
    }

    return {
      isReady: errors.length === 0,
      errors,
      warnings,
    };
  }
}

