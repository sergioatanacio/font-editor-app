import type { ImportPreviewRecord, ImportPreviewStore } from "../../domain/ports";

function clone(preview: ImportPreviewRecord): ImportPreviewRecord {
  return structuredClone(preview);
}

export class ImportPreviewStoreAdapter implements ImportPreviewStore {
  private readonly map = new Map<string, ImportPreviewRecord>();

  async save(preview: ImportPreviewRecord): Promise<void> {
    this.map.set(preview.previewId, clone(preview));
  }

  async load(previewId: string): Promise<ImportPreviewRecord | null> {
    const value = this.map.get(previewId);
    return value ? clone(value) : null;
  }

  async delete(previewId: string): Promise<void> {
    this.map.delete(previewId);
  }

  async deleteExpired(nowIso: string): Promise<number> {
    const now = Date.parse(nowIso);
    let removed = 0;

    for (const [key, value] of this.map.entries()) {
      if (Date.parse(value.expiresAt) <= now) {
        this.map.delete(key);
        removed += 1;
      }
    }

    return removed;
  }
}
