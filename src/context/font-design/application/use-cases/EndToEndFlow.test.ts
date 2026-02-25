import { describe, expect, it } from "vitest";
import { CommitTemplateImportPreviewUseCase } from "./CommitTemplateImportPreviewUseCase";
import { CreateTypefaceUseCase } from "./CreateTypefaceUseCase";
import { ExportTypefaceToTtfUseCase } from "./ExportTypefaceToTtfUseCase";
import { PreviewTemplateImportUseCase } from "./PreviewTemplateImportUseCase";
import { InMemoryFileSystemGateway } from "../../infrastructure/fs/InMemoryFileSystemGateway";
import { IncrementalIdGenerator } from "../../infrastructure/ids/IncrementalIdGenerator";
import { InMemoryImportPreviewStore } from "../../infrastructure/persistence/InMemoryImportPreviewStore";
import { InMemoryProjectRepository } from "../../infrastructure/persistence/InMemoryProjectRepository";
import { StubGlyphVectorImporter } from "../../infrastructure/svg/StubGlyphVectorImporter";
import { StubFontBinaryExporter } from "../../infrastructure/ttf/StubFontBinaryExporter";
import { FixedClock } from "../../infrastructure/time/FixedClock";

describe("Flujo end-to-end", () => {
  it("crea proyecto, previsualiza importacion, aplica cambios y exporta", async () => {
    const projectRepository = new InMemoryProjectRepository();
    const importPreviewStore = new InMemoryImportPreviewStore();
    const clock = new FixedClock("2026-02-25T00:00:00.000Z");
    const idGenerator = new IncrementalIdGenerator(1, "test");
    const glyphVectorImporter = new StubGlyphVectorImporter();
    const fileSystemGateway = new InMemoryFileSystemGateway();
    const fontBinaryExporter = new StubFontBinaryExporter();

    const createTypeface = new CreateTypefaceUseCase(projectRepository, clock, idGenerator);
    const previewImport = new PreviewTemplateImportUseCase(
      projectRepository,
      glyphVectorImporter,
      importPreviewStore,
      clock,
    );
    const commitImport = new CommitTemplateImportPreviewUseCase(
      projectRepository,
      importPreviewStore,
      clock,
    );
    const exportTypeface = new ExportTypefaceToTtfUseCase(
      projectRepository,
      fontBinaryExporter,
      fileSystemGateway,
    );

    const createResult = await createTypeface.execute({
      familyName: "Demo Sans",
      styleName: "Regular",
      unitsPerEm: 1000,
      exportPreset: "minimal-latin",
      templateCharacterSelection: {
        includeLatamAlnum: true,
        includeCodeChars: false,
      },
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) {
      throw new Error(createResult.error.message);
    }

    const previewResult = await previewImport.execute({
      projectId: createResult.value.projectId,
      svgContent: "<svg/>",
      mapping: { glyphId: "A" },
    });
    expect(previewResult.ok).toBe(true);
    if (!previewResult.ok) {
      throw new Error(previewResult.error.message);
    }

    const commitResult = await commitImport.execute({
      projectId: createResult.value.projectId,
      previewId: previewResult.value.previewId,
    });
    expect(commitResult.ok).toBe(true);
    if (!commitResult.ok) {
      throw new Error(commitResult.error.message);
    }

    const exportResult = await exportTypeface.execute({
      projectId: createResult.value.projectId,
      filename: "demo.ttf",
    });
    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) {
      throw new Error(exportResult.error.message);
    }

    expect(exportResult.value.byteLength).toBeGreaterThan(0);
    const saved = fileSystemGateway.getSavedFile("demo.ttf");
    expect(saved).not.toBeNull();
    expect(saved?.content instanceof Uint8Array).toBe(true);
  });
});
