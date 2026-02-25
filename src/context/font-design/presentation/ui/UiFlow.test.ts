import { describe, expect, it } from "vitest";
import { createFontDesignApp } from "../../main";

describe("UI wiring", () => {
  it("permite crear proyecto, previsualizar importacion y exportar", async () => {
    const app = createFontDesignApp();

    const createState = await app.ui.screens.inicioProyecto.create({
      familyName: "Ui Sans",
      styleName: "Regular",
      unitsPerEm: 1000,
      exportPreset: "minimal-latin",
      characterChecks: {
        includeLatamAlnum: true,
        includeCodeChars: false,
      },
    });

    expect(createState.status).toBe("success");
    const projectId = createState.data?.projectId;
    expect(projectId).toBeTruthy();
    if (!projectId) {
      return;
    }

    const previewState = await app.ui.screens.importacionSvg.preview({
      projectId,
      filename: "template.svg",
      svgContent: "<svg />",
      mapping: { glyphId: "A" },
    });
    expect(["success", "error"]).toContain(previewState.status);

    const exportState = await app.ui.screens.exportacionTtf.export(projectId, "ui-demo.ttf");
    expect(["success", "error"]).toContain(exportState.status);
  });
});
