import type { GlyphVectorImporter, ImportedGlyphBatch } from "../../domain/ports";

type WorkerRequest = {
  svgContent: string;
  mapping: unknown;
};

type WorkerResponse = {
  result?: ImportedGlyphBatch;
  error?: string;
};

function isDomParserUnavailable(batch?: ImportedGlyphBatch): boolean {
  if (!batch) return false;
  return batch.globalIssues.some(
    (issue) => issue.code === "MISSING_TEMPLATE_ROOT" && issue.message.includes("DOMParser no disponible"),
  );
}

export class SvgImportWorkerAdapter implements GlyphVectorImporter {
  constructor(private readonly fallbackImporter: GlyphVectorImporter) {}

  async importFromSvg(input: string, mapping: unknown): Promise<ImportedGlyphBatch> {
    if (typeof Worker === "undefined") {
      return this.fallbackImporter.importFromSvg(input, mapping);
    }

    return new Promise<ImportedGlyphBatch>((resolve) => {
      const worker = new Worker(new URL("./svgImportWorkerRuntime.ts", import.meta.url), { type: "module" });
      const payload: WorkerRequest = { svgContent: input, mapping };

      worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
        worker.terminate();
        if (event.data.error) {
          console.warn("[IMPORT_TRACE][WORKER_ADAPTER] worker-error:fallback-main-thread", { error: event.data.error });
          resolve(await this.fallbackImporter.importFromSvg(input, mapping));
          return;
        }

        const workerResult = event.data.result as ImportedGlyphBatch | undefined;
        if (isDomParserUnavailable(workerResult)) {
          console.warn("[IMPORT_TRACE][WORKER_ADAPTER] domparser-missing-in-worker:fallback-main-thread");
          resolve(await this.fallbackImporter.importFromSvg(input, mapping));
          return;
        }

        resolve(workerResult as ImportedGlyphBatch);
      };

      worker.onerror = async (error) => {
        worker.terminate();
        console.warn("[IMPORT_TRACE][WORKER_ADAPTER] worker-onerror:fallback-main-thread", {
          message: error.message,
        });
        resolve(await this.fallbackImporter.importFromSvg(input, mapping));
      };

      worker.postMessage(payload);
    });
  }
}
