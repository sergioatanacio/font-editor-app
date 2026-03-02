import { describe, expect, it } from "vitest";
import { createFontDesignApp } from "../../main";

describe("ProjectFacade linked file", () => {
  it("permite vincular y guardar proyecto en archivo vinculado", async () => {
    const app = createFontDesignApp();

    const created = await app.facades.project.createProject({
      familyName: "Linked Sans",
      styleName: "Regular",
      unitsPerEm: 1000,
      exportPreset: "freeform",
      templateCharacterSelection: {
        includeLatamAlnum: true,
        includeCodeChars: false,
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const linked = await app.facades.project.linkProjectFile("linked.json");
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;

    const saved = await app.facades.project.saveProjectToLinkedFile(created.value.projectId);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.filename).toBe("linked.json");
    expect(saved.value.byteLength).toBeGreaterThan(10);
  });
});

