import type { ImportPreviewRecord, ImportPreviewStore } from "../../domain/ports";

function clonePreview(preview: ImportPreviewRecord): ImportPreviewRecord {
  return structuredClone(preview);
}

export class InMemoryImportPreviewStore implements ImportPreviewStore {
  private readonly store = new Map<string, ImportPreviewRecord>();

  async save(preview: ImportPreviewRecord): Promise<void> {
    this.store.set(preview.previewId, clonePreview(preview));
  }

  async load(previewId: string): Promise<ImportPreviewRecord | null> {
    const preview = this.store.get(previewId);
    return preview ? clonePreview(preview) : null;
  }

  async delete(previewId: string): Promise<void> {
    this.store.delete(previewId);
  }

  async deleteExpired(nowIso: string): Promise<number> {
    let removed = 0;
    const now = Date.parse(nowIso);

    for (const [previewId, preview] of this.store.entries()) {
      if (Date.parse(preview.expiresAt) <= now) {
        this.store.delete(previewId);
        removed += 1;
      }
    }

    return removed;
  }
}
