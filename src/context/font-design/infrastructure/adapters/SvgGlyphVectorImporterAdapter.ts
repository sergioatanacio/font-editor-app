import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
import type {
  GlyphOutlineSnapshot,
  GlyphVectorImporter,
  ImportIssue,
  ImportedGlyphBatch,
} from "../../domain/ports";

type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SUPPORTED_SCHEMA_VERSION = "1.0.0";

interface TemplateMetadata {
  templateSchemaVersion: string;
  unitsPerEm: number;
  grid: {
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    padding: number;
  };
}

interface TemplateMappingLike {
  requiredGlyphIds?: readonly string[];
}

function issue(
  code: string,
  message: string,
  severity: "error" | "warning",
  glyphId?: string,
  context?: Record<string, unknown>,
): ImportIssue {
  return { code, message, severity, glyphId, context };
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function multiply(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function parseTransform(transform: string | null): Matrix {
  if (!transform) {
    return IDENTITY;
  }

  let current = IDENTITY;
  const chunks = transform.match(/[a-zA-Z]+\([^\)]*\)/g) ?? [];

  for (const chunk of chunks) {
    const open = chunk.indexOf("(");
    const name = chunk.slice(0, open).trim().toLowerCase();
    const values = chunk
      .slice(open + 1, -1)
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((x) => Number(x));

    let next = IDENTITY;
    if (name === "matrix" && values.length === 6) {
      next = { a: values[0], b: values[1], c: values[2], d: values[3], e: values[4], f: values[5] };
    } else if (name === "translate") {
      const tx = values[0] ?? 0;
      const ty = values[1] ?? 0;
      next = { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
    } else if (name === "scale") {
      const sx = values[0] ?? 1;
      const sy = values[1] ?? sx;
      next = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    } else if (name === "rotate") {
      const angle = ((values[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cx = values[1] ?? 0;
      const cy = values[2] ?? 0;
      next = multiply(
        multiply({ a: 1, b: 0, c: 0, d: 1, e: cx, f: cy }, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }),
        { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy },
      );
    } else if (name === "skewx") {
      const angle = ((values[0] ?? 0) * Math.PI) / 180;
      next = { a: 1, b: 0, c: Math.tan(angle), d: 1, e: 0, f: 0 };
    } else if (name === "skewy") {
      const angle = ((values[0] ?? 0) * Math.PI) / 180;
      next = { a: 1, b: Math.tan(angle), c: 0, d: 1, e: 0, f: 0 };
    }

    current = multiply(current, next);
  }

  return current;
}

function elementTransformChain(node: Element): Matrix {
  let current: Element | null = node;
  const chain: Matrix[] = [];

  while (current) {
    chain.push(parseTransform(current.getAttribute("transform")));
    current = current.parentElement;
  }

  return chain.reverse().reduce((acc, m) => multiply(acc, m), IDENTITY);
}

function parseMetadata(root: ParentNode): { metadata?: TemplateMetadata; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const metadataNode = root.querySelector("metadata");

  if (!metadataNode || !metadataNode.textContent) {
    issues.push(issue("INVALID_SCHEMA_VERSION", "Metadata faltante en plantilla.", "error"));
    return { issues };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(metadataNode.textContent);
  } catch {
    issues.push(issue("INVALID_SCHEMA_VERSION", "Metadata JSON invalida.", "error"));
    return { issues };
  }

  const data = parsed as Partial<TemplateMetadata>;
  if (data.templateSchemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    issues.push(
      issue("INVALID_SCHEMA_VERSION", "Version de schema incompatible.", "error", undefined, {
        expected: SUPPORTED_SCHEMA_VERSION,
        got: data.templateSchemaVersion,
      }),
    );
  }

  if (!data.grid || typeof data.unitsPerEm !== "number") {
    issues.push(issue("INVALID_SCHEMA_VERSION", "Metadata incompleta para importacion.", "error"));
    return { issues };
  }

  const padding = Number(data.grid.padding);
  const cellHeight = Number(data.grid.cellHeight);
  if (!(padding >= 0) || !(cellHeight > 2 * padding)) {
    issues.push(
      issue("INVALID_CELL_REFERENCE", "Parametros de celda invalidos: padding/cellHeight.", "error", undefined, {
        padding,
        cellHeight,
      }),
    );
  }

  return {
    metadata: {
      templateSchemaVersion: data.templateSchemaVersion ?? SUPPORTED_SCHEMA_VERSION,
      unitsPerEm: Number(data.unitsPerEm),
      grid: {
        cols: Number(data.grid.cols),
        rows: Number(data.grid.rows),
        cellWidth: Number(data.grid.cellWidth),
        cellHeight: Number(data.grid.cellHeight),
        padding,
      },
    },
    issues,
  };
}

function mapToTypefaceSpace(
  command: any,
  slotIndex: number,
  metadata: TemplateMetadata,
): any {
  const { cols, cellWidth, cellHeight, padding } = metadata.grid;
  const cellEmHeightReference = cellHeight - 2 * padding;
  const scale = metadata.unitsPerEm / cellEmHeightReference;
  const row = Math.floor(slotIndex / cols);
  const col = slotIndex % cols;

  const cellLeftInner = col * cellWidth + padding;
  const cellBottomInner = (row + 1) * cellHeight - padding;

  const convertPoint = (x: number, y: number) => ({
    x: round4((x - cellLeftInner) * scale),
    y: round4((cellBottomInner - y) * scale),
  });

  if (command.type === SVGPathData.MOVE_TO || command.type === SVGPathData.LINE_TO) {
    const p = convertPoint(command.x, command.y);
    return { ...command, x: p.x, y: p.y };
  }

  if (command.type === SVGPathData.CURVE_TO) {
    const p1 = convertPoint(command.x1, command.y1);
    const p2 = convertPoint(command.x2, command.y2);
    const p = convertPoint(command.x, command.y);
    return {
      ...command,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      x: p.x,
      y: p.y,
    };
  }

  if (command.type === SVGPathData.QUAD_TO) {
    const p1 = convertPoint(command.x1, command.y1);
    const p = convertPoint(command.x, command.y);
    return {
      ...command,
      x1: p1.x,
      y1: p1.y,
      x: p.x,
      y: p.y,
    };
  }

  return command;
}

function toDomainContour(
  commands: readonly any[],
  glyphId: string,
): { contour?: Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const contour: Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }> = [];
  let startPoint: { x: number; y: number } | null = null;

  if (commands.length === 0) {
    return { contour: [], issues };
  }

  if (commands[0].type !== SVGPathData.MOVE_TO) {
    issues.push(issue("OPEN_CONTOUR", "El contorno debe iniciar con M.", "error", glyphId));
  }

  for (const cmd of commands) {
    if (cmd.type === SVGPathData.MOVE_TO) {
      contour.push({ type: "M", values: [cmd.x, cmd.y] });
      if (!startPoint) {
        startPoint = { x: cmd.x, y: cmd.y };
      }
    } else if (cmd.type === SVGPathData.LINE_TO) {
      contour.push({ type: "L", values: [cmd.x, cmd.y] });
    } else if (cmd.type === SVGPathData.QUAD_TO) {
      contour.push({ type: "Q", values: [cmd.x1, cmd.y1, cmd.x, cmd.y] });
    } else if (cmd.type === SVGPathData.CURVE_TO) {
      contour.push({ type: "C", values: [cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y] });
    } else if (cmd.type === SVGPathData.CLOSE_PATH) {
      contour.push({ type: "Z", values: [] });
    } else {
      issues.push(issue("UNSUPPORTED_PATH_COMMAND", "Comando de path no soportado.", "warning", glyphId, { type: cmd.type }));
      continue;
    }

    for (const value of contour[contour.length - 1].values) {
      if (!Number.isFinite(value)) {
        issues.push(issue("NON_FINITE_COORDINATE", "Coordenada no finita detectada.", "error", glyphId));
      }
    }
  }

  const last = contour[contour.length - 1];
  const isExplicitlyClosed = commands[commands.length - 1]?.type === SVGPathData.CLOSE_PATH || last?.type === "Z";
  const isImplicitlyClosed =
    !!startPoint &&
    last?.values.length === 2 &&
    Math.abs(last.values[0] - startPoint.x) < 1e-6 &&
    Math.abs(last.values[1] - startPoint.y) < 1e-6;

  if (!isExplicitlyClosed) {
    if (isImplicitlyClosed) {
      contour.push({ type: "Z", values: [] });
    } else {
      issues.push(issue("OPEN_CONTOUR", "El contorno debe cerrar con Z.", "error", glyphId));
    }
  }

  return { contour, issues };
}

function computeBounds(outline: GlyphOutlineSnapshot): { xMin: number; yMin: number; xMax: number; yMax: number } | undefined {
  let xMin = Number.POSITIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  for (const contour of outline.contours) {
    for (const command of contour) {
      for (let i = 0; i < command.values.length; i += 2) {
        const x = command.values[i];
        const y = command.values[i + 1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return undefined;
        }
        xMin = Math.min(xMin, x);
        yMin = Math.min(yMin, y);
        xMax = Math.max(xMax, x);
        yMax = Math.max(yMax, y);
      }
    }
  }

  if (!Number.isFinite(xMin)) {
    return undefined;
  }

  return { xMin, yMin, xMax, yMax };
}

function parseMapping(mapping: unknown): TemplateMappingLike {
  if (!mapping || typeof mapping !== "object") {
    return {};
  }
  const candidate = mapping as Partial<TemplateMappingLike>;
  return {
    requiredGlyphIds: Array.isArray(candidate.requiredGlyphIds)
      ? candidate.requiredGlyphIds.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

function normalizePathCommands(pathElement: Element, d: string): any[] {
  const transform = elementTransformChain(pathElement);
  return new SVGPathData(d)
    .transform(SVGPathDataTransformer.TO_ABS())
    .transform(SVGPathDataTransformer.NORMALIZE_HVZ())
    .transform(SVGPathDataTransformer.NORMALIZE_ST())
    .transform(SVGPathDataTransformer.A_TO_C())
    .transform(SVGPathDataTransformer.MATRIX(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f))
    .commands;
}

function computeSourceBounds(commands: readonly any[]): { xMin: number; yMin: number; xMax: number; yMax: number } | undefined {
  let xMin = Number.POSITIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  const pushPoint = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    xMin = Math.min(xMin, x);
    yMin = Math.min(yMin, y);
    xMax = Math.max(xMax, x);
    yMax = Math.max(yMax, y);
  };

  for (const cmd of commands) {
    if (cmd.type === SVGPathData.MOVE_TO || cmd.type === SVGPathData.LINE_TO) {
      pushPoint(cmd.x, cmd.y);
    } else if (cmd.type === SVGPathData.QUAD_TO) {
      pushPoint(cmd.x1, cmd.y1);
      pushPoint(cmd.x, cmd.y);
    } else if (cmd.type === SVGPathData.CURVE_TO) {
      pushPoint(cmd.x1, cmd.y1);
      pushPoint(cmd.x2, cmd.y2);
      pushPoint(cmd.x, cmd.y);
    }
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(yMin) || !Number.isFinite(xMax) || !Number.isFinite(yMax)) {
    return undefined;
  }

  return { xMin, yMin, xMax, yMax };
}

function innerCellRect(slotIndex: number, metadata: TemplateMetadata): { xMin: number; yMin: number; xMax: number; yMax: number } {
  const { cols, cellWidth, cellHeight, padding } = metadata.grid;
  const row = Math.floor(slotIndex / cols);
  const col = slotIndex % cols;
  const xMin = col * cellWidth + padding;
  const yMin = row * cellHeight + padding;
  const xMax = (col + 1) * cellWidth - padding;
  const yMax = (row + 1) * cellHeight - padding;
  return { xMin, yMin, xMax, yMax };
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function selectCellEntryForSourceBounds(
  sourceBounds: { xMin: number; yMin: number; xMax: number; yMax: number },
  entries: Array<{ slotIndex: number }>,
  metadata: TemplateMetadata,
): number {
  const cx = (sourceBounds.xMin + sourceBounds.xMax) / 2;
  const cy = (sourceBounds.yMin + sourceBounds.yMax) / 2;

  const insideCandidates: number[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const rect = innerCellRect(entries[i].slotIndex, metadata);
    if (cx >= rect.xMin && cx <= rect.xMax && cy >= rect.yMin && cy <= rect.yMax) {
      insideCandidates.push(i);
    }
  }

  if (insideCandidates.length > 0) {
    insideCandidates.sort((a, b) => entries[a].slotIndex - entries[b].slotIndex);
    return insideCandidates[0];
  }

  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < entries.length; i += 1) {
    const rect = innerCellRect(entries[i].slotIndex, metadata);
    const rx = (rect.xMin + rect.xMax) / 2;
    const ry = (rect.yMin + rect.yMax) / 2;
    const d2 = distanceSquared(cx, cy, rx, ry);
    if (d2 < bestDistance || (Math.abs(d2 - bestDistance) < 1e-9 && entries[i].slotIndex < entries[best].slotIndex)) {
      best = i;
      bestDistance = d2;
    }
  }

  return best;
}

function extractParserErrorDetails(parserErrorText: string): { line?: number; column?: number; message: string } {
  const normalized = parserErrorText.replace(/\s+/g, " ").trim();
  const lineColMatch = normalized.match(/line\s+(\d+)\s+at\s+column\s+(\d+)/i);
  const line = lineColMatch ? Number(lineColMatch[1]) : undefined;
  const column = lineColMatch ? Number(lineColMatch[2]) : undefined;
  return { line, column, message: normalized };
}

function sourceContextByLine(source: string, line?: number, column?: number): string {
  if (!line || !Number.isFinite(line) || line < 1) {
    return "";
  }
  const lines = source.split(/\r?\n/);
  const target = lines[line - 1] ?? "";
  if (!target) {
    return "";
  }
  if (!column || !Number.isFinite(column) || column < 1) {
    return target.slice(0, 240);
  }
  const start = Math.max(0, column - 80);
  const end = Math.min(target.length, column + 80);
  return target.slice(start, end);
}

export class SvgGlyphVectorImporterAdapter implements GlyphVectorImporter {
  async importFromSvg(input: string, mapping: unknown): Promise<ImportedGlyphBatch> {
    const globalIssues: ImportIssue[] = [];
    console.info("[IMPORT_TRACE][ADAPTER] import:start", {
      svgLength: input.length,
      hasTemplateRootMarker: input.includes("ctf-template-root"),
      hasSvgTag: input.includes("<svg"),
      mappingType: typeof mapping,
    });

    if (typeof DOMParser === "undefined") {
      console.error("[IMPORT_TRACE][ADAPTER] fail:domparser-missing");
      return {
        items: [],
        globalIssues: [issue("MISSING_TEMPLATE_ROOT", "DOMParser no disponible en este runtime.", "error")],
        preview: [],
        isBlocking: true,
      };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "image/svg+xml");
    const parserErrorNode = doc.querySelector("parsererror");
    if (parserErrorNode) {
      const parserErrorText = parserErrorNode.textContent ?? "parsererror without details";
      const details = extractParserErrorDetails(parserErrorText);
      console.error("[IMPORT_TRACE][ADAPTER] fail:parsererror", {
        parserMessage: details.message,
        line: details.line,
        column: details.column,
        sourceContext: sourceContextByLine(input, details.line, details.column),
        headPreview: input.slice(0, 220),
        tailPreview: input.slice(Math.max(0, input.length - 220)),
      });
      return {
        items: [],
        globalIssues: [issue("MISSING_TEMPLATE_ROOT", "SVG invalido o no parseable.", "error", undefined, {
          parserMessage: details.message,
          line: details.line,
          column: details.column,
          sourceContext: sourceContextByLine(input, details.line, details.column),
        })],
        preview: [],
        isBlocking: true,
      };
    }

    const root = doc.querySelector("g#ctf-template-root");
    if (!root) {
      console.error("[IMPORT_TRACE][ADAPTER] fail:missing-root", {
        svgId: doc.querySelector("svg")?.getAttribute("id") ?? "",
        gCount: doc.querySelectorAll("g").length,
        rootCandidates: Array.from(doc.querySelectorAll("g[id]")).slice(0, 8).map((x) => x.getAttribute("id") ?? ""),
      });
      return {
        items: [],
        globalIssues: [issue("MISSING_TEMPLATE_ROOT", "No existe ctf-template-root en la plantilla.", "error")],
        preview: [],
        isBlocking: true,
      };
    }

    const metadataResult = parseMetadata(doc);
    globalIssues.push(...metadataResult.issues);
    if (!metadataResult.metadata) {
      console.error("[IMPORT_TRACE][ADAPTER] fail:metadata", {
        issues: metadataResult.issues.map((x) => x.code),
      });
      return {
        items: [],
        globalIssues,
        preview: [],
        isBlocking: true,
      };
    }

    const metadata = metadataResult.metadata;
    const mappingInfo = parseMapping(mapping);
    const cells = Array.from(root.querySelectorAll("g[data-role='glyph-cell']"));
    const seen = new Set<string>();
    const consumedPaths = new Set<Element>();

    const cellEntries: Array<{
      glyphId: string;
      slotIndex: number;
      codePoint?: number;
      issues: ImportIssue[];
      contours: Array<Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>>;
    }> = [];
    const cellByGlyphId = new Map<string, (typeof cellEntries)[number]>();

    const assignPathByPosition = (
      pathElement: Element,
    ): void => {
      const d = pathElement.getAttribute("d") ?? "";
      if (!d.trim() || cellEntries.length === 0) {
        return;
      }

      try {
        const normalizedInDocument = normalizePathCommands(pathElement, d);
        const sourceBounds = computeSourceBounds(normalizedInDocument);
        if (!sourceBounds) {
          return;
        }

        const selectedIndex = selectCellEntryForSourceBounds(sourceBounds, cellEntries, metadata);
        const cellEntry = cellEntries[selectedIndex];
        const normalizedInTypeface = normalizedInDocument.map((command) =>
          mapToTypefaceSpace(command, cellEntry.slotIndex, metadata),
        );

        const contourResult = toDomainContour(normalizedInTypeface, cellEntry.glyphId);
        cellEntry.issues.push(...contourResult.issues);
        if (contourResult.contour && contourResult.contour.length > 0) {
          cellEntry.contours.push(contourResult.contour);
        }
      } catch {
        globalIssues.push(
          issue("UNSUPPORTED_PATH_COMMAND", "No se pudo normalizar un path.", "warning", undefined, {
            pathId: pathElement.getAttribute("id") ?? undefined,
          }),
        );
      }
    };

    for (const cell of cells) {
      const glyphId = cell.getAttribute("data-glyph-id")?.trim();
      const slotIndex = Number(cell.getAttribute("data-slot-index") ?? "0");

      if (!glyphId) {
        globalIssues.push(issue("CELL_NOT_FOUND", "Celda sin data-glyph-id.", "error"));
        continue;
      }

      if (seen.has(glyphId)) {
        globalIssues.push(issue("DUPLICATE_GLYPH_ID", "GlyphId duplicado en celdas de plantilla.", "error", glyphId));
        continue;
      }
      seen.add(glyphId);

      const itemIssues: ImportIssue[] = [];
      const drawingGroup = cell.querySelector("g[data-role='drawing']");

      const pathElements = drawingGroup ? Array.from(drawingGroup.querySelectorAll("path")) : [];
      const codePointRaw = cell.getAttribute("data-codepoint");
      const codePoint = codePointRaw ? Number(codePointRaw) : undefined;

      const cellEntry = {
        glyphId,
        slotIndex,
        codePoint: Number.isFinite(codePoint) ? codePoint : undefined,
        issues: itemIssues,
        contours: [] as Array<Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>>,
      };
      cellEntries.push(cellEntry);
      cellByGlyphId.set(glyphId, cellEntry);

      for (const pathElement of pathElements) {
        consumedPaths.add(pathElement);
        assignPathByPosition(pathElement);
      }
    }

    const allPaths = Array.from(doc.querySelectorAll("path"));
    for (const pathElement of allPaths) {
      if (consumedPaths.has(pathElement)) {
        continue;
      }
      assignPathByPosition(pathElement);
    }

    const items: Array<{
      glyphId: string;
      outline: GlyphOutlineSnapshot | null;
      bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
      issues: readonly ImportIssue[];
    }> = [];
    const preview: Array<{
      glyphId: string;
      codePoint?: number;
      status: "ok" | "warning" | "error" | "empty";
      issues: readonly ImportIssue[];
      outline?: GlyphOutlineSnapshot;
      bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
    }> = [];

    for (const entry of cellEntries) {
      if (entry.contours.length === 0) {
        entry.issues.push(issue("EMPTY_DRAWING", "No se encontraron contornos para la celda.", "warning", entry.glyphId));
      }
      const outline = entry.contours.length > 0 ? { contours: entry.contours } : null;
      const bounds = outline ? computeBounds(outline) : undefined;
      const hasError = entry.issues.some((x) => x.severity === "error");
      const hasWarning = entry.issues.some((x) => x.severity === "warning");

      const status = hasError ? "error" : !outline ? "empty" : hasWarning ? "warning" : "ok";

      items.push({ glyphId: entry.glyphId, outline, bounds, issues: entry.issues });
      preview.push({
        glyphId: entry.glyphId,
        codePoint: entry.codePoint,
        status,
        issues: entry.issues,
        outline: outline ?? undefined,
        bounds,
      });
    }

    for (const requiredGlyphId of mappingInfo.requiredGlyphIds ?? []) {
      if (!cellByGlyphId.has(requiredGlyphId)) {
        globalIssues.push(
          issue("CELL_NOT_FOUND", "Falta celda requerida por mapping.", "error", requiredGlyphId),
        );
      }
    }

    const isBlocking = [...globalIssues, ...items.flatMap((x) => x.issues)].some((x) => x.severity === "error");
    console.info("[IMPORT_TRACE][ADAPTER] import:done", {
      cells: cells.length,
      items: items.length,
      preview: preview.length,
      globalIssueCodes: globalIssues.map((x) => x.code).slice(0, 10),
      isBlocking,
    });

    return {
      items,
      globalIssues,
      isBlocking,
      preview,
    };
  }
}
