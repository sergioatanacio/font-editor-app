import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import { Glyph } from "../../domain/entities/Glyph";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphMetrics } from "../../domain/value-objects/GlyphMetrics";
import { GlyphName } from "../../domain/value-objects/GlyphName";
import { UnicodeCodePoint } from "../../domain/value-objects/UnicodeCodePoint";
import type { Clock, GlyphOutlineSnapshot, ImportIssue, ImportPreviewStore, ProjectRepository } from "../../domain/ports";
import { toDomainTypeface, toTypefaceSnapshot } from "./typefaceSnapshotMapper";
import { GlyphOutline } from "../../domain/value-objects/GlyphOutline";

export interface CommitTemplateImportPreviewInput {
  projectId: string;
  previewId: string;
}

export interface CommitTemplateImportPreviewOutput {
  projectId: string;
  importedCount: number;
  issues: readonly ImportIssue[];
}

function inferGlyphKind(glyphId: string): "base" | "space" {
  if (glyphId === "space" || glyphId.toLowerCase() === "u0020") {
    return "space";
  }
  return "base";
}

function asAppError(code: string, message: string, context?: Record<string, unknown>): AppError {
  return {
    code,
    message,
    context,
    layer: "application",
    severity: "error",
    recoverable: true,
  };
}

function fromDomainError(error: { code: string; message: string; context?: Readonly<Record<string, unknown>> }): AppError {
  return {
    code: error.code,
    message: error.message,
    context: error.context,
    layer: "domain",
    severity: "error",
    recoverable: false,
  };
}

function computeBoundsFromOutline(outline: GlyphOutlineSnapshot): { xMin: number; xMax: number } | undefined {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;

  for (const contour of outline.contours) {
    for (const command of contour) {
      for (let i = 0; i + 1 < command.values.length; i += 2) {
        const x = command.values[i];
        const y = command.values[i + 1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return undefined;
        }
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }
    }
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    return undefined;
  }

  return { xMin, xMax };
}

function normalizeOutlineX(outline: GlyphOutlineSnapshot, shiftX: number): GlyphOutlineSnapshot {
  if (Math.abs(shiftX) < 1e-9) {
    return outline;
  }

  return {
    contours: outline.contours.map((contour) =>
      contour.map((command) => {
        if (command.type === "Z") {
          return { type: "Z", values: [] as number[] };
        }
        const values = [...command.values];
        for (let i = 0; i + 1 < values.length; i += 2) {
          values[i] += shiftX;
        }
        return { type: command.type, values };
      }),
    ),
  };
}

function deriveImportedMetrics(input: {
  unitsPerEm: number;
  outline: GlyphOutlineSnapshot;
  bounds?: { xMin: number; xMax: number };
}): { advanceWidth: number; leftSideBearing: number; shiftX: number } {
  const effectiveBounds = input.bounds ?? computeBoundsFromOutline(input.outline);
  if (!effectiveBounds || !Number.isFinite(effectiveBounds.xMin) || !Number.isFinite(effectiveBounds.xMax)) {
    return {
      advanceWidth: Math.max(1, Math.round(input.unitsPerEm * 0.6)),
      leftSideBearing: 0,
      shiftX: 0,
    };
  }

  const width = Math.max(0, effectiveBounds.xMax - effectiveBounds.xMin);
  return {
    advanceWidth: Math.max(1, Math.round(width)),
    leftSideBearing: 0,
    shiftX: -effectiveBounds.xMin,
  };
}

export class CommitTemplateImportPreviewUseCase
  implements UseCase<CommitTemplateImportPreviewInput, CommitTemplateImportPreviewOutput, AppError>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly importPreviewStore: ImportPreviewStore,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: CommitTemplateImportPreviewInput,
  ): Promise<Result<CommitTemplateImportPreviewOutput, AppError>> {
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return {
        ok: false,
        error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto."),
      };
    }

    const preview = await this.importPreviewStore.load(input.previewId);
    if (!preview || preview.projectId !== input.projectId) {
      return {
        ok: false,
        error: asAppError("IMPORT_PREVIEW_NOT_FOUND", "No se encontro la previsualizacion de importacion."),
      };
    }

    if (Date.parse(this.clock.now()) > Date.parse(preview.expiresAt)) {
      return {
        ok: false,
        error: asAppError("IMPORT_PREVIEW_EXPIRED", "La previsualizacion expiro; vuelve a importar el archivo."),
      };
    }

    if (project.updatedAt !== preview.baseProjectUpdatedAt) {
      return {
        ok: false,
        error: asAppError("IMPORT_PREVIEW_STALE", "El proyecto cambio desde la previsualizacion."),
      };
    }

    if (preview.batch.isBlocking) {
      return {
        ok: false,
        error: asAppError("IMPORT_BLOCKED_BY_VALIDATION", "La importacion fue bloqueada por validacion."),
      };
    }

    const typefaceResult = toDomainTypeface(project.typeface);
    if (!typefaceResult.ok) {
      return { ok: false, error: typefaceResult.error };
    }

    let nextTypeface = typefaceResult.value;

    for (const item of preview.batch.items) {
      let unicode: UnicodeCodePoint | undefined;
      if (item.codePoint != null) {
        const unicodeResult = UnicodeCodePoint.create(item.codePoint);
        if (!unicodeResult.ok) {
          return { ok: false, error: fromDomainError(unicodeResult.error) };
        }
        unicode = unicodeResult.value;
      }

      const glyphId = GlyphId.create(item.glyphId);
      if (!glyphId.ok) {
        return { ok: false, error: fromDomainError(glyphId.error) };
      }

      const existing = nextTypeface.glyphs.get(glyphId.value.toString());

      if (item.outline == null) {
        if (existing) {
          const cleared = existing.clearOutline();
          const withUnicode = unicode ? cleared.assignUnicode(unicode) : cleared;
          const clearResult = nextTypeface.replaceGlyph(withUnicode);
          if (!clearResult.ok) {
            return { ok: false, error: fromDomainError(clearResult.error) };
          }
          nextTypeface = clearResult.value;
          continue;
        }

        const name = GlyphName.create(item.glyphId);
        if (!name.ok) {
          return { ok: false, error: fromDomainError(name.error) };
        }

        const metrics = GlyphMetrics.create({
          advanceWidth: Math.round(nextTypeface.metrics.unitsPerEm * 0.6),
          leftSideBearing: 0,
        });
        if (!metrics.ok) {
          return { ok: false, error: fromDomainError(metrics.error) };
        }

        const glyph = Glyph.create({
          id: glyphId.value,
          name: name.value,
          kind: inferGlyphKind(item.glyphId),
          metrics: metrics.value,
          outline: GlyphOutline.empty(),
          unicode,
        });
        if (!glyph.ok) {
          return { ok: false, error: fromDomainError(glyph.error) };
        }

        const addResult = nextTypeface.addGlyph(glyph.value);
        if (!addResult.ok) {
          return { ok: false, error: fromDomainError(addResult.error) };
        }
        nextTypeface = addResult.value;
        continue;
      }

      const importedMetrics = deriveImportedMetrics({
        unitsPerEm: nextTypeface.metrics.unitsPerEm,
        outline: item.outline,
        bounds: item.bounds ? { xMin: item.bounds.xMin, xMax: item.bounds.xMax } : undefined,
      });
      const normalizedOutline = normalizeOutlineX(item.outline, importedMetrics.shiftX);
      const outline = GlyphOutline.create(
        normalizedOutline.contours.map((contour) =>
          contour.map((command) => ({ type: command.type, values: [...command.values] })),
        ),
      );
      if (!outline.ok) {
        return { ok: false, error: fromDomainError(outline.error) };
      }
      const metrics = GlyphMetrics.create({
        advanceWidth: importedMetrics.advanceWidth,
        leftSideBearing: importedMetrics.leftSideBearing,
      });
      if (!metrics.ok) {
        return { ok: false, error: fromDomainError(metrics.error) };
      }

      if (existing) {
        const replaced = existing.replaceOutline(outline.value).changeMetrics(metrics.value);
        const withUnicode = unicode ? replaced.assignUnicode(unicode) : replaced;
        const replaceResult = nextTypeface.replaceGlyph(withUnicode);
        if (!replaceResult.ok) {
          return { ok: false, error: fromDomainError(replaceResult.error) };
        }
        nextTypeface = replaceResult.value;
        continue;
      }

      const name = GlyphName.create(item.glyphId);
      if (!name.ok) {
        return { ok: false, error: fromDomainError(name.error) };
      }

      const glyph = Glyph.create({
        id: glyphId.value,
        name: name.value,
        kind: inferGlyphKind(item.glyphId),
        metrics: metrics.value,
        outline: outline.value,
        unicode,
      });
      if (!glyph.ok) {
        return { ok: false, error: fromDomainError(glyph.error) };
      }

      const addResult = nextTypeface.addGlyph(glyph.value);
      if (!addResult.ok) {
        return { ok: false, error: fromDomainError(addResult.error) };
      }
      nextTypeface = addResult.value;
    }

    const nextProject = {
      ...project,
      typeface: toTypefaceSnapshot(nextTypeface),
      updatedAt: this.clock.now(),
    };

    await this.projectRepository.save(nextProject);
    await this.importPreviewStore.delete(input.previewId);

    const issues = [...preview.batch.globalIssues, ...preview.batch.preview.flatMap((x) => x.issues)];
    return {
      ok: true,
      value: {
        projectId: input.projectId,
        importedCount: preview.batch.items.length,
        issues,
      },
    };
  }
}
