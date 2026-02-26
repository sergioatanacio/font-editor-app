import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import { Glyph } from "../../domain/entities/Glyph";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphMetrics } from "../../domain/value-objects/GlyphMetrics";
import { GlyphName } from "../../domain/value-objects/GlyphName";
import { UnicodeCodePoint } from "../../domain/value-objects/UnicodeCodePoint";
import type { Clock, ImportIssue, ImportPreviewStore, ProjectRepository } from "../../domain/ports";
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

      const outline = GlyphOutline.create(
        item.outline.contours.map((contour) => contour.map((command) => ({ type: command.type, values: command.values }))),
      );
      if (!outline.ok) {
        return { ok: false, error: fromDomainError(outline.error) };
      }

      if (existing) {
        const replaced = existing.replaceOutline(outline.value);
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
