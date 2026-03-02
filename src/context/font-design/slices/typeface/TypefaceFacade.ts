import {
  AssignUnicodeToGlyphUseCase
} from "./AssignUnicodeToGlyphUseCase";
import { GetTypefaceSnapshotUseCase } from "./GetTypefaceSnapshotUseCase";
import { ReplaceGlyphOutlineUseCase } from "./ReplaceGlyphOutlineUseCase";
import { UpdateGlyphMetricsUseCase } from "./UpdateGlyphMetricsUseCase";

export class TypefaceFacade {
  constructor(
    private readonly getTypefaceSnapshotUseCase: GetTypefaceSnapshotUseCase,
    private readonly assignUnicodeUseCase: AssignUnicodeToGlyphUseCase,
    private readonly replaceGlyphOutlineUseCase: ReplaceGlyphOutlineUseCase,
    private readonly updateGlyphMetricsUseCase: UpdateGlyphMetricsUseCase,
  ) {}

  async getTypefaceSnapshot(input: { projectId: string }) {
    return this.getTypefaceSnapshotUseCase.execute(input);
  }

  async assignUnicode(input: { projectId: string; glyphId: string; codePoint: number }) {
    return this.assignUnicodeUseCase.execute(input);
  }

  async replaceOutline(input: { projectId: string; glyphId: string; outline: { contours: Array<Array<{ type: "M" | "L" | "Q" | "C" | "Z"; values: number[] }>> } }) {
    return this.replaceGlyphOutlineUseCase.execute(input);
  }

  async updateGlyphMetrics(input: { projectId: string; glyphId: string; advanceWidth: number; leftSideBearing: number }) {
    return this.updateGlyphMetricsUseCase.execute(input);
  }
}
