import type { FileSystemGateway } from "../../domain/ports";
import { GenerateTemplateSvgUseCase } from "./GenerateTemplateSvgUseCase";

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

