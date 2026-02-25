import type { TemplateExporter } from "../../domain/ports";

export class StubTemplateExporter implements TemplateExporter {
  async exportSvgTemplate(_spec: unknown): Promise<string> {
    return [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"ctf-template-root\">",
      "  <metadata>{\"templateSchemaVersion\":\"1.1.0\"}</metadata>",
      "  <g data-glyph-id=\"A\">",
      "    <path data-role=\"drawing\" d=\"M0 0 L50 100 L100 0 Z\" />",
      "  </g>",
      "</svg>",
    ].join("\n");
  }
}
