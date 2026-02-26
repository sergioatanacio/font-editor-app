import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type {
  Clock,
  GlyphOutlineSnapshot,
  GlyphVectorImporter,
  ImportIssue,
  ImportPreviewStore,
  ImportSummary,
  ProjectRepository,
} from "../../domain/ports";

export interface PreviewTemplateImportInput {
  projectId: string;
  svgContent: string;
  mapping: unknown;
}

export interface PreviewTemplateImportOutput {
  previewId: string;
  glyphPreview: ReadonlyArray<{
    glyphId: string;
    codePoint?: number;
    status: "ok" | "warning" | "error" | "empty";
    issues: readonly ImportIssue[];
    outline?: GlyphOutlineSnapshot;
    bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
  }>;
  summary: ImportSummary;
  issues: readonly ImportIssue[];
  isBlocking: boolean;
  expiresAt: string;
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

export class PreviewTemplateImportUseCase
  implements UseCase<PreviewTemplateImportInput, PreviewTemplateImportOutput, AppError>
{
  private static readonly PREVIEW_TTL_MS = 900_000;

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly glyphVectorImporter: GlyphVectorImporter,
    private readonly importPreviewStore: ImportPreviewStore,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: PreviewTemplateImportInput,
  ): Promise<Result<PreviewTemplateImportOutput, AppError>> {
    console.info("[IMPORT_TRACE][USE_CASE] execute:start", {
      projectId: input.projectId,
      svgLength: input.svgContent.length,
      hasTemplateRootMarker: input.svgContent.includes("ctf-template-root"),
    });
    const project = await this.projectRepository.load(input.projectId);
    if (!project) {
      return {
        ok: false,
        error: asAppError("PROJECT_NOT_FOUND", "No se encontro el proyecto."),
      };
    }

    let batch;
    try {
      batch = await this.glyphVectorImporter.importFromSvg(input.svgContent, input.mapping);
    } catch (error) {
      console.error("[IMPORT_TRACE][USE_CASE] importer:throw", {
        cause: error instanceof Error ? error.message : "unknown",
      });
      return {
        ok: false,
        error: asAppError("USE_CASE_EXECUTION_ERROR", "Fallo tecnico durante el parseo/importacion SVG.", {
          cause: error instanceof Error ? error.message : "unknown",
        }),
      };
    }
    const nowIso = this.clock.now();
    const expiresAtIso = new Date(Date.parse(nowIso) + PreviewTemplateImportUseCase.PREVIEW_TTL_MS).toISOString();

    const summary: ImportSummary = {
      total: batch.preview.length,
      ok: batch.preview.filter((x) => x.status === "ok").length,
      warning: batch.preview.filter((x) => x.status === "warning").length,
      error: batch.preview.filter((x) => x.status === "error").length,
      empty: batch.preview.filter((x) => x.status === "empty").length,
      blockingCount: [...batch.globalIssues, ...batch.preview.flatMap((x) => x.issues)].filter(
        (i) => i.severity === "error",
      ).length,
    };

    const issues = [...batch.globalIssues, ...batch.preview.flatMap((x) => x.issues)];
    const previewId = `${input.projectId}:${Date.parse(nowIso)}`;
    console.info("[IMPORT_TRACE][USE_CASE] execute:batch", {
      previewId,
      items: batch.items.length,
      preview: batch.preview.length,
      isBlocking: batch.isBlocking,
      globalIssueCodes: batch.globalIssues.map((x) => x.code).slice(0, 10),
      issueCodes: issues.map((x) => x.code).slice(0, 10),
    });

    await this.importPreviewStore.save({
      previewId,
      projectId: input.projectId,
      batch,
      createdAt: nowIso,
      expiresAt: expiresAtIso,
      baseProjectUpdatedAt: project.updatedAt,
    });

    return {
      ok: true,
      value: {
        previewId,
        glyphPreview: batch.preview,
        summary,
        issues,
        isBlocking: batch.isBlocking,
        expiresAt: expiresAtIso,
      },
    };
  }
}
