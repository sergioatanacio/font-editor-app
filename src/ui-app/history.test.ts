import { describe, expect, it } from "vitest";
import { pushHistory, redoHistory, undoHistory } from "./history";
import type { GlyphEditHistoryItem } from "./types";

function entry(id: string): GlyphEditHistoryItem {
  return {
    glyphId: id,
    before: {
      metrics: { advanceWidth: 600, leftSideBearing: 0 },
      outline: { contours: [[{ type: "Z", values: [] }]] },
    },
    after: {
      metrics: { advanceWidth: 600, leftSideBearing: 20 },
      outline: { contours: [[{ type: "Z", values: [] }]] },
    },
  };
}

describe("history", () => {
  it("push limpia rama redo", () => {
    const state = pushHistory({ undo: [entry("A")], redo: [entry("B")] }, entry("C"));
    expect(state.undo.length).toBe(2);
    expect(state.redo.length).toBe(0);
  });

  it("undo mueve item a redo", () => {
    const state = { undo: [entry("A"), entry("B")], redo: [] as GlyphEditHistoryItem[] };
    const result = undoHistory(state);
    expect(result.item?.glyphId).toBe("B");
    expect(result.next.undo.length).toBe(1);
    expect(result.next.redo.length).toBe(1);
  });

  it("redo mueve item a undo", () => {
    const state = { undo: [entry("A")], redo: [entry("B")] };
    const result = redoHistory(state);
    expect(result.item?.glyphId).toBe("B");
    expect(result.next.undo.length).toBe(2);
    expect(result.next.redo.length).toBe(0);
  });
});

