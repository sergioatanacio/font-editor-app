import type { Glyph } from "../../entities/Glyph";
import type { Typeface } from "../../entities/Typeface";

function glyphName(glyph: Glyph): string {
  return glyph.name.toString();
}

export interface TtfGlyphPlan {
  orderedGlyphs: Glyph[];
  shouldInjectNotdef: boolean;
}

export class TtfExportDomainService {
  createGlyphPlan(typeface: Typeface): TtfGlyphPlan {
    const all = Array.from(typeface.glyphs.values());
    const notdef = all.find((g) => glyphName(g) === ".notdef");
    const rest = all.filter((g) => g !== notdef);
    const space = rest.find((g) => glyphName(g) === "space");

    const others = rest.filter((g) => g !== space).sort((a, b) => {
      const au = a.unicode?.toNumber();
      const bu = b.unicode?.toNumber();

      if (au != null && bu != null) {
        return au - bu;
      }
      if (au != null) {
        return -1;
      }
      if (bu != null) {
        return 1;
      }

      return a.id.toString().localeCompare(b.id.toString());
    });

    const orderedGlyphs: Glyph[] = [];
    if (notdef) {
      orderedGlyphs.push(notdef);
    }
    if (space) {
      orderedGlyphs.push(space);
    }
    orderedGlyphs.push(...others);

    return {
      orderedGlyphs,
      shouldInjectNotdef: !notdef,
    };
  }
}
