import type { FileSystemGateway } from "../../domain/ports";
import {
  AssignUnicodeToGlyphUseCase,
  GenerateTemplateSvgUseCase,
  ReplaceGlyphOutlineUseCase,
  UpdateGlyphMetricsUseCase,
} from "../use-cases";

export class TypefaceFacade {
  constructor(
    private readonly assignUnicodeUseCase: AssignUnicodeToGlyphUseCase,
    private readonly replaceGlyphOutlineUseCase: ReplaceGlyphOutlineUseCase,
    private readonly updateGlyphMetricsUseCase: UpdateGlyphMetricsUseCase,
  ) {}

  async assignUnicode(input: { projectId: string; glyphId: string; codePoint: number }) {
    return this.assignUnicodeUseCase.execute(input);
  }

  async replaceOutline(input: { projectId: string; glyphId: string; outline: { contours: Array<Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>> } }) {
    return this.replaceGlyphOutlineUseCase.execute(input);
  }

  async updateGlyphMetrics(input: { projectId: string; glyphId: string; advanceWidth: number; leftSideBearing: number }) {
    return this.updateGlyphMetricsUseCase.execute(input);
  }
}

export class TemplateFacade {
  constructor(
    private readonly generateTemplateSvgUseCase: GenerateTemplateSvgUseCase,
    private readonly fileSystemGateway: FileSystemGateway,
  ) {}

  async generateTemplate(input: { projectId: string; filename?: string }) {
    const result = await this.generateTemplateSvgUseCase.execute({ projectId: input.projectId });
    if (!result.ok) {
      return result;
    }

    const filename = input.filename ?? `template-${input.projectId}.svg`;
    await this.fileSystemGateway.saveFile(filename, result.value.svgContent);

    return {
      ok: true as const,
      value: {
        ...result.value,
        filename,
      },
    };
  }
}
