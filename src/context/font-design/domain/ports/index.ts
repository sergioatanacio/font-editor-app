import type { Typeface } from "../entities/Typeface";

export interface ExportIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  glyphId?: string;
  context?: Readonly<Record<string, unknown>>;
}

export interface ImportIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  glyphId?: string;
  context?: Readonly<Record<string, unknown>>;
}

export interface ImportPreviewItem {
  glyphId: string;
  codePoint?: number;
  status: "ok" | "warning" | "error" | "empty";
  issues: readonly ImportIssue[];
}

export interface ImportSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  empty: number;
  blockingCount: number;
}

export interface GlyphOutlineSnapshot {
  contours: ReadonlyArray<
    ReadonlyArray<{
      type: "M" | "L" | "Q" | "C" | "Z";
      values: readonly number[];
    }>
  >;
}

export interface GlyphSnapshot {
  id: string;
  name: string;
  kind: "base" | "mark" | "ligature" | "space";
  metrics: {
    advanceWidth: number;
    leftSideBearing: number;
  };
  outline: GlyphOutlineSnapshot;
  unicodeCodePoint?: number;
}

export interface TypefaceSnapshot {
  id: string;
  metadata: {
    familyName: string;
    styleName: string;
    designer?: string;
    version?: string;
  };
  metrics: {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    lineGap: number;
    baseline: number;
  };
  glyphs: readonly GlyphSnapshot[];
}

export interface ImportedGlyphBatch {
  items: ReadonlyArray<{
    glyphId: string;
    outline: GlyphOutlineSnapshot | null;
    bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
    issues: readonly ImportIssue[];
  }>;
  globalIssues: readonly ImportIssue[];
  isBlocking: boolean;
  preview: readonly ImportPreviewItem[];
}

export interface ImportPreviewRecord {
  previewId: string;
  projectId: string;
  batch: ImportedGlyphBatch;
  createdAt: string;
  expiresAt: string;
  baseProjectUpdatedAt: string;
}

export interface TypefaceProjectSnapshot {
  schemaVersion: string;
  projectId: string;
  typeface: TypefaceSnapshot;
  templateMapping: unknown;
  exportPreset: "minimal-latin" | "freeform";
  templateCharacterSelection: {
    includeLatamAlnum: boolean;
    includeCodeChars: boolean;
    derivedPreset: "latam-alnum" | "code-dev" | "latam-plus-code";
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepository {
  save(project: TypefaceProjectSnapshot): Promise<void>;
  load(projectId: string): Promise<TypefaceProjectSnapshot | null>;
  delete(projectId: string): Promise<void>;
}

export interface TemplateExporter {
  exportSvgTemplate(spec: unknown): Promise<string>;
}

export interface GlyphVectorImporter {
  importFromSvg(input: string, mapping: unknown): Promise<ImportedGlyphBatch>;
}

export interface FontBinaryExporter {
  exportTtf(typeface: Typeface): Promise<{ bytes: Uint8Array; warnings: ExportIssue[] }>;
}

export interface ProjectSerializer {
  serialize(project: TypefaceProjectSnapshot): string;
  deserialize(raw: string): TypefaceProjectSnapshot;
}

export interface FileSystemGateway {
  saveFile(filename: string, content: Blob | Uint8Array | string): Promise<void>;
  pickFile(accept: string[]): Promise<{ name: string; content: string } | null>;
}

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  nextId(): string;
}

export interface ImportPreviewStore {
  save(preview: ImportPreviewRecord): Promise<void>;
  load(previewId: string): Promise<ImportPreviewRecord | null>;
  delete(previewId: string): Promise<void>;
  deleteExpired(nowIso: string): Promise<number>;
}
