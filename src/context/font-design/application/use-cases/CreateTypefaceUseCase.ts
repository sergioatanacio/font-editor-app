import type { UseCase } from "../common/UseCase";
import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";
import type { Clock, IdGenerator, ProjectRepository, TypefaceProjectSnapshot } from "../../domain/ports";
import { FontMetrics } from "../../domain/value-objects/FontMetrics";
import { TypefaceId } from "../../domain/value-objects/TypefaceId";
import { TypefaceMetadata } from "../../domain/value-objects/TypefaceMetadata";
import { Typeface } from "../../domain/entities/Typeface";
import { toTypefaceSnapshot } from "./typefaceSnapshotMapper";

export interface CreateTypefaceInput {
  projectId?: string;
  familyName: string;
  styleName: string;
  unitsPerEm: number;
  exportPreset: "minimal-latin" | "freeform";
  templateCharacterSelection: {
    includeLatamAlnum: boolean;
    includeCodeChars: boolean;
  };
}

export interface CreateTypefaceOutput {
  typefaceId: string;
  projectId: string;
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

export class CreateTypefaceUseCase
  implements UseCase<CreateTypefaceInput, CreateTypefaceOutput, AppError>
{
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    input: CreateTypefaceInput,
  ): Promise<Result<CreateTypefaceOutput, AppError>> {
    const familyName = input.familyName.trim();
    const styleName = input.styleName.trim();

    if (!familyName || !styleName) {
      return {
        ok: false,
        error: asAppError("INVALID_TYPEFACE_METADATA", "familyName y styleName son obligatorios."),
      };
    }

    if (!input.templateCharacterSelection.includeLatamAlnum && !input.templateCharacterSelection.includeCodeChars) {
      return {
        ok: false,
        error: asAppError("INVALID_CHARACTER_SELECTION", "Debes activar al menos un conjunto de caracteres."),
      };
    }

    const projectId = input.projectId?.trim() || this.idGenerator.nextId();
    const typefaceId = this.idGenerator.nextId();
    const now = this.clock.now();

    const derivedPreset =
      input.templateCharacterSelection.includeLatamAlnum && input.templateCharacterSelection.includeCodeChars
        ? "latam-plus-code"
        : input.templateCharacterSelection.includeLatamAlnum
          ? "latam-alnum"
          : "code-dev";

    const typefaceIdVo = TypefaceId.create(typefaceId);
    if (!typefaceIdVo.ok) {
      return { ok: false, error: fromDomainError(typefaceIdVo.error) };
    }

    const metadata = TypefaceMetadata.create({ familyName, styleName });
    if (!metadata.ok) {
      return { ok: false, error: fromDomainError(metadata.error) };
    }

    const fontMetrics = FontMetrics.create({
      unitsPerEm: input.unitsPerEm,
      ascender: Math.round(input.unitsPerEm * 0.8),
      descender: -Math.round(input.unitsPerEm * 0.2),
      lineGap: Math.round(input.unitsPerEm * 0.2),
      baseline: 0,
    });
    if (!fontMetrics.ok) {
      return { ok: false, error: fromDomainError(fontMetrics.error) };
    }

    const typeface = Typeface.create({
      id: typefaceIdVo.value,
      metadata: metadata.value,
      metrics: fontMetrics.value,
      glyphs: [],
    });
    if (!typeface.ok) {
      return { ok: false, error: fromDomainError(typeface.error) };
    }

    const snapshot: TypefaceProjectSnapshot = {
      schemaVersion: "1.1.0",
      projectId,
      typeface: toTypefaceSnapshot(typeface.value),
      templateMapping: {},
      exportPreset: input.exportPreset,
      templateCharacterSelection: {
        includeLatamAlnum: input.templateCharacterSelection.includeLatamAlnum,
        includeCodeChars: input.templateCharacterSelection.includeCodeChars,
        derivedPreset,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.projectRepository.save(snapshot);
    return { ok: true, value: { typefaceId, projectId } };
  }
}
