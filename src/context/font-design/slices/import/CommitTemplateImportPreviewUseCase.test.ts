import { describe, expect, it } from "vitest";
import type { GlyphOutlineSnapshot, ImportedGlyphBatch, TypefaceProjectSnapshot } from "../../domain/ports";
import { InMemoryImportPreviewStore } from "../../infrastructure/persistence/InMemoryImportPreviewStore";
import { InMemoryProjectRepository } from "../../infrastructure/persistence/InMemoryProjectRepository";
import { FixedClock } from "../../infrastructure/time/FixedClock";
import { IncrementalIdGenerator } from "../../infrastructure/ids/IncrementalIdGenerator";
import { CreateTypefaceUseCase } from "../project/CreateTypefaceUseCase";
import { CommitTemplateImportPreviewUseCase } from "./CommitTemplateImportPreviewUseCase";

function rectOutline(xMin: number, xMax: number, yMin: number, yMax: number): GlyphOutlineSnapshot {
  return {
    contours: [[
      { type: "M", values: [xMin, yMin] },
      { type: "L", values: [xMax, yMin] },
      { type: "L", values: [xMax, yMax] },
      { type: "L", values: [xMin, yMax] },
      { type: "Z", values: [] },
    ]],
  };
}

function xBounds(outline: GlyphOutlineSnapshot): { xMin: number; xMax: number } {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  for (const contour of outline.contours) {
    for (const command of contour) {
      for (let i = 0; i + 1 < command.values.length; i += 2) {
        xMin = Math.min(xMin, command.values[i]);
        xMax = Math.max(xMax, command.values[i]);
      }
    }
  }
  return { xMin, xMax };
}

function yValues(outline: GlyphOutlineSnapshot): number[] {
  const values: number[] = [];
  for (const contour of outline.contours) {
    for (const command of contour) {
      for (let i = 1; i < command.values.length; i += 2) {
        values.push(command.values[i]);
      }
    }
  }
  return values;
}

function singleItemBatch(item: ImportedGlyphBatch["items"][number]): ImportedGlyphBatch {
  return {
    items: [item],
    globalIssues: [],
    isBlocking: false,
    preview: [{
      glyphId: item.glyphId,
      codePoint: item.codePoint,
      status: item.outline ? "ok" : "empty",
      issues: item.issues,
      outline: item.outline ?? undefined,
      bounds: item.bounds,
    }],
  };
}

async function createProjectFixture() {
  const projectRepository = new InMemoryProjectRepository();
  const previewStore = new InMemoryImportPreviewStore();
  const clock = new FixedClock("2026-01-01T00:00:00.000Z");
  const idGenerator = new IncrementalIdGenerator(1, "local");
  const createUseCase = new CreateTypefaceUseCase(projectRepository, clock, idGenerator);
  const created = await createUseCase.execute({
    familyName: "Atlas Sans",
    styleName: "Regular",
    unitsPerEm: 1000,
    exportPreset: "freeform",
    templateCharacterSelection: { includeLatamAlnum: true, includeCodeChars: false },
  });
  if (!created.ok) {
    throw new Error(`failed to create fixture project: ${created.error.code}`);
  }
  const project = await projectRepository.load(created.value.projectId);
  if (!project) {
    throw new Error("fixture project was not persisted");
  }
  return {
    projectRepository,
    previewStore,
    clock,
    projectId: created.value.projectId,
    project,
  };
}

async function savePreview(params: {
  previewStore: InMemoryImportPreviewStore;
  project: TypefaceProjectSnapshot;
  projectId: string;
  previewId: string;
  batch: ImportedGlyphBatch;
}) {
  await params.previewStore.save({
    previewId: params.previewId,
    projectId: params.projectId,
    batch: params.batch,
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T01:00:00.000Z",
    baseProjectUpdatedAt: params.project.updatedAt,
  });
}

describe("CommitTemplateImportPreviewUseCase", () => {
  it("normaliza X al inicio del trazado y calcula advanceWidth proporcional para glifo nuevo", async () => {
    const fixture = await createProjectFixture();
    const previewId = "preview:new-a";
    const outline = rectOutline(120, 420, 10, 710);

    await savePreview({
      previewStore: fixture.previewStore,
      project: fixture.project,
      projectId: fixture.projectId,
      previewId,
      batch: singleItemBatch({
        glyphId: "A",
        codePoint: 65,
        outline,
        bounds: { xMin: 120, yMin: 10, xMax: 420, yMax: 710 },
        issues: [],
      }),
    });

    const commitUseCase = new CommitTemplateImportPreviewUseCase(
      fixture.projectRepository,
      fixture.previewStore,
      fixture.clock,
    );
    const result = await commitUseCase.execute({ projectId: fixture.projectId, previewId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const saved = await fixture.projectRepository.load(fixture.projectId);
    expect(saved).toBeTruthy();
    const glyph = saved?.typeface.glyphs.find((x) => x.id === "A");
    expect(glyph).toBeTruthy();
    expect(glyph?.metrics.advanceWidth).toBe(300);
    expect(glyph?.metrics.leftSideBearing).toBe(0);
    const bounds = xBounds(glyph!.outline);
    expect(bounds.xMin).toBe(0);
    expect(bounds.xMax).toBe(300);
  });

  it("actualiza metricas y outline cuando el glifo ya existe", async () => {
    const fixture = await createProjectFixture();
    const previewId = "preview:existing-b";
    const projectWithGlyph: TypefaceProjectSnapshot = {
      ...fixture.project,
      typeface: {
        ...fixture.project.typeface,
        glyphs: [{
          id: "B",
          name: "B",
          kind: "base",
          metrics: { advanceWidth: 600, leftSideBearing: 25 },
          outline: rectOutline(0, 50, 0, 500),
          unicodeCodePoint: 66,
        }],
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await fixture.projectRepository.save(projectWithGlyph);

    await savePreview({
      previewStore: fixture.previewStore,
      project: projectWithGlyph,
      projectId: fixture.projectId,
      previewId,
      batch: singleItemBatch({
        glyphId: "B",
        codePoint: 66,
        outline: rectOutline(50, 180, 20, 520),
        bounds: { xMin: 50, yMin: 20, xMax: 180, yMax: 520 },
        issues: [],
      }),
    });

    const commitUseCase = new CommitTemplateImportPreviewUseCase(
      fixture.projectRepository,
      fixture.previewStore,
      fixture.clock,
    );
    const result = await commitUseCase.execute({ projectId: fixture.projectId, previewId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const saved = await fixture.projectRepository.load(fixture.projectId);
    const glyph = saved?.typeface.glyphs.find((x) => x.id === "B");
    expect(glyph).toBeTruthy();
    expect(glyph?.metrics.advanceWidth).toBe(130);
    expect(glyph?.metrics.leftSideBearing).toBe(0);
    const bounds = xBounds(glyph!.outline);
    expect(bounds.xMin).toBe(0);
    expect(bounds.xMax).toBe(130);
  });

  it("mantiene coordenadas Y intactas al normalizar horizontalmente", async () => {
    const fixture = await createProjectFixture();
    const previewId = "preview:y-preserved";
    const outline: GlyphOutlineSnapshot = {
      contours: [[
        { type: "M", values: [80, -30] },
        { type: "L", values: [140, 100] },
        { type: "L", values: [110, 260] },
        { type: "L", values: [60, 120] },
        { type: "Z", values: [] },
      ]],
    };
    const yBefore = yValues(outline);

    await savePreview({
      previewStore: fixture.previewStore,
      project: fixture.project,
      projectId: fixture.projectId,
      previewId,
      batch: singleItemBatch({
        glyphId: "C",
        codePoint: 67,
        outline,
        bounds: { xMin: 60, yMin: -30, xMax: 140, yMax: 260 },
        issues: [],
      }),
    });

    const commitUseCase = new CommitTemplateImportPreviewUseCase(
      fixture.projectRepository,
      fixture.previewStore,
      fixture.clock,
    );
    const result = await commitUseCase.execute({ projectId: fixture.projectId, previewId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const saved = await fixture.projectRepository.load(fixture.projectId);
    const glyph = saved?.typeface.glyphs.find((x) => x.id === "C");
    expect(glyph).toBeTruthy();
    expect(yValues(glyph!.outline)).toEqual(yBefore);
  });

  it("calcula bounds desde outline cuando no llegan bounds en el preview", async () => {
    const fixture = await createProjectFixture();
    const previewId = "preview:no-bounds";
    const outline = rectOutline(40, 140, 0, 700);

    await savePreview({
      previewStore: fixture.previewStore,
      project: fixture.project,
      projectId: fixture.projectId,
      previewId,
      batch: singleItemBatch({
        glyphId: "D",
        codePoint: 68,
        outline,
        issues: [],
      }),
    });

    const commitUseCase = new CommitTemplateImportPreviewUseCase(
      fixture.projectRepository,
      fixture.previewStore,
      fixture.clock,
    );
    const result = await commitUseCase.execute({ projectId: fixture.projectId, previewId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const saved = await fixture.projectRepository.load(fixture.projectId);
    const glyph = saved?.typeface.glyphs.find((x) => x.id === "D");
    expect(glyph).toBeTruthy();
    expect(glyph?.metrics.advanceWidth).toBe(100);
    expect(glyph?.metrics.leftSideBearing).toBe(0);
    const bounds = xBounds(glyph!.outline);
    expect(bounds.xMin).toBe(0);
    expect(bounds.xMax).toBe(100);
  });
});
