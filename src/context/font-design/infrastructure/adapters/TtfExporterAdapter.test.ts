import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as opentype from "opentype.js";
import { TtfExporterAdapter } from "./TtfExporterAdapter";
import { Typeface } from "../../domain/entities/Typeface";
import { Glyph } from "../../domain/entities/Glyph";
import { TypefaceId } from "../../domain/value-objects/TypefaceId";
import { TypefaceMetadata } from "../../domain/value-objects/TypefaceMetadata";
import { FontMetrics } from "../../domain/value-objects/FontMetrics";
import { GlyphId } from "../../domain/value-objects/GlyphId";
import { GlyphName } from "../../domain/value-objects/GlyphName";
import { GlyphMetrics } from "../../domain/value-objects/GlyphMetrics";
import { GlyphOutline } from "../../domain/value-objects/GlyphOutline";
import { UnicodeCodePoint } from "../../domain/value-objects/UnicodeCodePoint";

const GOLDEN_HASH = "47eb01cb77b571a60a67b2f9b24ecd58eee7682bee1960d6e62e19b7f9bd2e5e";
const GOLDEN_BYTES = 1104;

function must<T>(r: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!r.ok) {
    throw new Error(r.error.message);
  }
  return r.value;
}

function buildGlyph(params: {
  id: string;
  name: string;
  kind: "base" | "mark" | "ligature" | "space";
  advanceWidth: number;
  unicode?: number;
  outline?: GlyphOutline;
}): Glyph {
  const id = must(GlyphId.create(params.id));
  const name = must(GlyphName.create(params.name));
  const metrics = must(GlyphMetrics.create({ advanceWidth: params.advanceWidth, leftSideBearing: 0 }));
  const unicode = params.unicode == null ? undefined : must(UnicodeCodePoint.create(params.unicode));
  return must(
    Glyph.create({
      id,
      name,
      kind: params.kind,
      metrics,
      outline: params.outline ?? GlyphOutline.empty(),
      unicode,
    }),
  );
}

function buildTypeface(glyphs: Glyph[]): Typeface {
  const id = must(TypefaceId.create("tf-golden"));
  const metadata = must(TypefaceMetadata.create({ familyName: "Golden Sans", styleName: "Regular", version: "1.0" }));
  const metrics = must(FontMetrics.create({ unitsPerEm: 1000, ascender: 800, descender: -200, lineGap: 200, baseline: 0 }));
  return must(Typeface.create({ id, metadata, metrics, glyphs }));
}

describe("TtfExporterAdapter", () => {
  it("genera TTF determinista y coincide con golden", async () => {
    const outline = must(
      GlyphOutline.create([
        [
          { type: "M", values: [50, 0] },
          { type: "L", values: [500, 700] },
          { type: "L", values: [950, 0] },
          { type: "Z", values: [] },
        ],
      ]),
    );

    const tf = buildTypeface([
      buildGlyph({ id: "g-notdef", name: ".notdef", kind: "base", advanceWidth: 500 }),
      buildGlyph({ id: "g-space", name: "space", kind: "space", advanceWidth: 350, unicode: 32 }),
      buildGlyph({ id: "g-A", name: "A", kind: "base", advanceWidth: 700, unicode: 65, outline }),
    ]);

    const exporter = new TtfExporterAdapter();
    const out = await exporter.exportTtf(tf);

    const hash = createHash("sha256").update(out.bytes).digest("hex");
    expect(out.bytes.byteLength).toBe(GOLDEN_BYTES);
    expect(hash).toBe(GOLDEN_HASH);

    const goldenPath = resolve(process.cwd(), "test-assets", "golden", "minimal-latin.ttf");
    const golden = readFileSync(goldenPath);
    expect(Buffer.compare(Buffer.from(out.bytes), golden)).toBe(0);
  });

  it("autogenera .notdef cuando falta", async () => {
    const outline = must(
      GlyphOutline.create([
        [
          { type: "M", values: [50, 0] },
          { type: "L", values: [500, 700] },
          { type: "L", values: [950, 0] },
          { type: "Z", values: [] },
        ],
      ]),
    );

    const tf = buildTypeface([
      buildGlyph({ id: "g-space", name: "space", kind: "space", advanceWidth: 350, unicode: 32 }),
      buildGlyph({ id: "g-A", name: "A", kind: "base", advanceWidth: 700, unicode: 65, outline }),
    ]);

    const exporter = new TtfExporterAdapter();
    const out = await exporter.exportTtf(tf);
    const arr = Buffer.from(out.bytes);
    const parsed = opentype.parse(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));

    expect(parsed.glyphs.get(0).name).toBe(".notdef");
    expect(parsed.glyphs.get(0).advanceWidth).toBe(500);
  });

  it("emite warning de drift cuando C->Q supera 0.5", async () => {
    const cubic = must(
      GlyphOutline.create([
        [
          { type: "M", values: [0, 0] },
          { type: "C", values: [10, 1000, 990, -1000, 1000, 0] },
          { type: "Z", values: [] },
        ],
      ]),
    );

    const tf = buildTypeface([
      buildGlyph({ id: "g-notdef", name: ".notdef", kind: "base", advanceWidth: 500 }),
      buildGlyph({ id: "g-C", name: "C", kind: "base", advanceWidth: 700, unicode: 67, outline: cubic }),
    ]);

    const exporter = new TtfExporterAdapter();
    const out = await exporter.exportTtf(tf);

    expect(out.warnings.some((w) => w.code === "CURVE_APPROXIMATION_DRIFT")).toBe(true);
  });
});
