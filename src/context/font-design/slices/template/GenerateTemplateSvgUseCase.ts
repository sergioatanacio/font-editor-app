import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, ProjectRepository, TemplateExporter } from "../../domain/ports";
import { buildTemplateCharacters, deriveTemplateCharacterPreset, requiredGlyphNamesForExportPreset } from "./characterCatalog";

export interface GenerateTemplateSvgInput {
  projectId: string;
}

export interface GenerateTemplateSvgOutput {
  projectId: string;
  svgContent: string;
  mapping: {
    schemaVersion: "1.1.0";
    slotByGlyphId: Record<string, number>;
    requiredGlyphIds: string[];
    optionalGlyphIds: string[];
  };
  glyphCount: number;
  templateCharacterPreset: "latam-alnum" | "code-dev" | "latam-plus-code";
}

function asAppError(code: string, message: string): AppError {
  return { code, message, layer: "application", severity: "error", recoverable: true };
}

export class GenerateTemplateSvgUseCase implements UseCase<GenerateTemplateSvgInput, GenerateTemplateSvgOutput, AppError> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly templateExporter: TemplateExporter,
    private readonly clock: Clock,
  ) {}

  async execute(input: GenerateTemplateSvgInput): Promise<Result<GenerateTemplateSvgOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return { ok: false, error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto.") };
    }

    const templateCharacterPreset = deriveTemplateCharacterPreset(project.templateCharacterSelection);
    const characters = buildTemplateCharacters(project.templateCharacterSelection);

    const glyphSlots = characters.map((item, index) => ({
      glyphId: item.glyphId,
      glyphName: item.glyphName,
      codePoint: item.codePoint,
      kind: item.kind,
      slotIndex: index,
    }));

    const requiredByPresetNames = new Set(requiredGlyphNamesForExportPreset(project.exportPreset));
    const requiredGlyphIds = glyphSlots
      .filter((slot) => requiredByPresetNames.has(slot.glyphName))
      .map((slot) => slot.glyphId);

    const optionalGlyphIds = glyphSlots
      .filter((slot) => !requiredByPresetNames.has(slot.glyphName))
      .map((slot) => slot.glyphId);

    const mapping = {
      schemaVersion: "1.1.0" as const,
      slotByGlyphId: Object.fromEntries(glyphSlots.map((slot) => [slot.glyphId, slot.slotIndex])),
      requiredGlyphIds,
      optionalGlyphIds,
    };

    const cols = 12;
    const rows = Math.max(1, Math.ceil(glyphSlots.length / cols));

    const svgContent = await this.templateExporter.exportSvgTemplate({
      typefaceId: project.typeface.id,
      templateCharacterPreset,
      templateCharacterSelection: project.templateCharacterSelection,
      unitsPerEm: project.typeface.metrics.unitsPerEm,
      metrics: {
        ascender: project.typeface.metrics.ascender,
        descender: project.typeface.metrics.descender,
      },
      grid: {
        cols,
        rows,
        cellWidth: 120,
        cellHeight: 120,
        padding: 12,
      },
      glyphSlots,
    });

    await this.projectRepository.save({
      ...project,
      templateMapping: mapping,
      updatedAt: this.clock.now(),
    });

    return {
      ok: true,
      value: {
        projectId: input.projectId,
        svgContent,
        mapping,
        glyphCount: glyphSlots.length,
        templateCharacterPreset,
      },
    };
  }
}
