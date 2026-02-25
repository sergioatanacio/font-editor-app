import type { ImportedGlyphBatch } from "../../domain/ports";
import { SvgGlyphVectorImporterAdapter } from "../adapters/SvgGlyphVectorImporterAdapter";

type WorkerRequest = {
  svgContent: string;
  mapping: unknown;
};

type WorkerResponse = {
  result?: ImportedGlyphBatch;
  error?: string;
};

const importer = new SvgGlyphVectorImporterAdapter();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const result = await importer.importFromSvg(event.data.svgContent, event.data.mapping);
    const response: WorkerResponse = { result };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = { error: error instanceof Error ? error.message : "Worker import error" };
    self.postMessage(response);
  }
};
