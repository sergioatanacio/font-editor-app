import * as opentype from "opentype.js";
import type { FontBinaryExporter, ExportIssue } from "../../domain/ports";
import type { Typeface } from "../../domain/entities/Typeface";
import type { Glyph } from "../../domain/entities/Glyph";
import { TtfExportDomainService } from "../../domain/services";

const CUBIC_TO_QUADRATIC_DRIFT_WARNING = 0.5;
const CUBIC_TO_QUADRATIC_TOLERANCE = 0.25;

interface Point {
  x: number;
  y: number;
}

function roundInt(value: number): number {
  return Math.round(value);
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function approximateCubicAsQuadratics(p0: Point, p1: Point, p2: Point, p3: Point): {
  segments: ReadonlyArray<{ c: Point; end: Point }>;
  maxDrift: number;
} {
  const mid = cubicPoint(p0, p1, p2, p3, 0.5);

  const q1Control = {
    x: p0.x + (3 / 4) * (p1.x - p0.x),
    y: p0.y + (3 / 4) * (p1.y - p0.y),
  };

  const q2Control = {
    x: p3.x + (3 / 4) * (p2.x - p3.x),
    y: p3.y + (3 / 4) * (p2.y - p3.y),
  };

  let maxDrift = 0;
  const samples = [0.25, 0.5, 0.75];
  for (const t of samples) {
    const cubic = cubicPoint(p0, p1, p2, p3, t);
    const quadApprox =
      t <= 0.5
        ? quadraticPoint(p0, q1Control, mid, t / 0.5)
        : quadraticPoint(mid, q2Control, p3, (t - 0.5) / 0.5);
    maxDrift = Math.max(maxDrift, distance(cubic, quadApprox));
  }

  return {
    segments: [
      { c: q1Control, end: mid },
      { c: q2Control, end: p3 },
    ],
    maxDrift,
  };
}

function glyphName(glyph: Glyph): string {
  return glyph.name.toString();
}

export class TtfExporterAdapter implements FontBinaryExporter {
  constructor(private readonly domainService: TtfExportDomainService = new TtfExportDomainService()) {}

  async exportTtf(typeface: Typeface): Promise<{ bytes: Uint8Array; warnings: ExportIssue[] }> {
    const warnings: ExportIssue[] = [];
    const fontGlyphs: opentype.Glyph[] = [];
    const plan = this.domainService.createGlyphPlan(typeface);
    const ordered = plan.orderedGlyphs;
    const letterSpacing = Math.max(-1000, Math.min(1000, Math.round(typeface.metadata.letterSpacing ?? 0)));

    if (plan.shouldInjectNotdef) {
      const notdefPath = new opentype.Path();
      fontGlyphs.push(
        new opentype.Glyph({
          name: ".notdef",
          unicode: undefined,
          advanceWidth: roundInt(typeface.metrics.unitsPerEm * 0.5),
          path: notdefPath,
        }),
      );
    }

    for (const glyph of ordered) {
      const path = new opentype.Path();
      let current: Point = { x: 0, y: 0 };

      for (const contour of glyph.outline.contours) {
        for (const command of contour) {
          const kind = command.type;
          if (kind === "M") {
            const p = { x: roundInt(command.values[0]), y: roundInt(command.values[1]) };
            path.moveTo(p.x, p.y);
            current = p;
          } else if (kind === "L") {
            const p = { x: roundInt(command.values[0]), y: roundInt(command.values[1]) };
            path.lineTo(p.x, p.y);
            current = p;
          } else if (kind === "Q") {
            const c = { x: roundInt(command.values[0]), y: roundInt(command.values[1]) };
            const p = { x: roundInt(command.values[2]), y: roundInt(command.values[3]) };
            path.quadraticCurveTo(c.x, c.y, p.x, p.y);
            current = p;
          } else if (kind === "C") {
            const p1 = { x: roundInt(command.values[0]), y: roundInt(command.values[1]) };
            const p2 = { x: roundInt(command.values[2]), y: roundInt(command.values[3]) };
            const p3 = { x: roundInt(command.values[4]), y: roundInt(command.values[5]) };
            const approx = approximateCubicAsQuadratics(current, p1, p2, p3);

            if (approx.maxDrift > CUBIC_TO_QUADRATIC_DRIFT_WARNING) {
              warnings.push({
                code: "CURVE_APPROXIMATION_DRIFT",
                message: "Aproximacion C->Q con drift superior al limite v1.",
                severity: "warning",
                glyphId: glyph.id.toString(),
                context: {
                  drift: approx.maxDrift,
                  warningThreshold: CUBIC_TO_QUADRATIC_DRIFT_WARNING,
                  tolerance: CUBIC_TO_QUADRATIC_TOLERANCE,
                },
              });
            }

            for (const segment of approx.segments) {
              path.quadraticCurveTo(
                roundInt(segment.c.x),
                roundInt(segment.c.y),
                roundInt(segment.end.x),
                roundInt(segment.end.y),
              );
            }
            current = p3;
          } else if (kind === "Z") {
            path.close();
          }
        }
      }

      fontGlyphs.push(
        new opentype.Glyph({
          name: glyphName(glyph),
          unicode: glyph.unicode?.toNumber(),
          advanceWidth: Math.max(1, roundInt(glyph.metrics.advanceWidth + letterSpacing)),
          path,
        }),
      );
    }

    const font = new opentype.Font({
      familyName: typeface.metadata.familyName,
      styleName: typeface.metadata.styleName,
      unitsPerEm: roundInt(typeface.metrics.unitsPerEm),
      ascender: roundInt(typeface.metrics.ascender),
      descender: roundInt(typeface.metrics.descender),
      glyphs: fontGlyphs,
    });
    // Keep output deterministic for golden tests and reproducible builds.
    (font as any).createdTimestamp = 1;

    const postScriptName = `${typeface.metadata.familyName}-${typeface.metadata.styleName}`.replace(/\s+/g, "");
    const fullName = `${typeface.metadata.familyName} ${typeface.metadata.styleName}`.trim();
    const version = typeface.metadata.version ? `Version ${typeface.metadata.version}` : "Version 1.0";

    (font as any).names = {
      fontFamily: { en: typeface.metadata.familyName },
      fontSubfamily: { en: typeface.metadata.styleName },
      fullName: { en: fullName },
      postScriptName: { en: postScriptName },
      version: { en: version },
    };

    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(1000);
          return;
        }
        super(...(args as [any]));
      }

      static now(): number {
        return 1000;
      }
    }

    let bytes: Uint8Array;
    try {
      (globalThis as any).Date = FixedDate;
      bytes = new Uint8Array(font.toArrayBuffer());
    } finally {
      (globalThis as any).Date = RealDate;
    }
    return { bytes, warnings };
  }
}
