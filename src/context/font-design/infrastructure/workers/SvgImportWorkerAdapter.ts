import type { GlyphVectorImporter, ImportedGlyphBatch } from "../../domain/ports";

type WorkerRequest = {
  svgContent: string;
  mapping: unknown;
};

type WorkerResponse = {
  result?: ImportedGlyphBatch;
  error?: string;
};

export class SvgImportWorkerAdapter implements GlyphVectorImporter {
  constructor(private readonly fallbackImporter: GlyphVectorImporter) {}

  async importFromSvg(input: string, mapping: unknown): Promise<ImportedGlyphBatch> {
    if (typeof Worker === "undefined") {
      return this.fallbackImporter.importFromSvg(input, mapping);
    }

    return new Promise<ImportedGlyphBatch>((resolve, reject) => {
      const worker = new Worker(new URL("./svgImportWorkerRuntime.ts", import.meta.url), { type: "module" });
      const payload: WorkerRequest = { svgContent: input, mapping };

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        worker.terminate();
        if (event.data.error) {
          reject(new Error(event.data.error));
          return;
        }
        resolve(event.data.result as ImportedGlyphBatch);
      };

      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };

      worker.postMessage(payload);
    });
  }
}
