import type { GlyphEditHistoryItem } from "./types";

export interface HistoryState {
  undo: GlyphEditHistoryItem[];
  redo: GlyphEditHistoryItem[];
}

export function pushHistory(state: HistoryState, item: GlyphEditHistoryItem): HistoryState {
  return {
    undo: [...state.undo, item],
    redo: [],
  };
}

export function undoHistory(state: HistoryState): { next: HistoryState; item: GlyphEditHistoryItem | null } {
  if (state.undo.length === 0) {
    return { next: state, item: null };
  }
  const item = state.undo[state.undo.length - 1] ?? null;
  if (!item) return { next: state, item: null };
  return {
    item,
    next: {
      undo: state.undo.slice(0, -1),
      redo: [...state.redo, item],
    },
  };
}

export function redoHistory(state: HistoryState): { next: HistoryState; item: GlyphEditHistoryItem | null } {
  if (state.redo.length === 0) {
    return { next: state, item: null };
  }
  const item = state.redo[state.redo.length - 1] ?? null;
  if (!item) return { next: state, item: null };
  return {
    item,
    next: {
      undo: [...state.undo, item],
      redo: state.redo.slice(0, -1),
    },
  };
}

