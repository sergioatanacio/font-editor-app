import type { FileSystemGateway } from "../../domain/ports";

export class BrowserFileSystemGatewayAdapter implements FileSystemGateway {
  private linkedHandle: unknown | null = null;
  private linkedFilename = "";

  async saveFile(filename: string, content: Blob | Uint8Array | string): Promise<void> {
    const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    };

    const blob =
      typeof content === "string"
        ? new Blob([content], { type: "text/plain;charset=utf-8" })
        : content instanceof Uint8Array
          ? new Blob([toArrayBuffer(content)], {
              type: "application/octet-stream",
            })
          : content;

    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async pickFile(accept: string[]): Promise<{ name: string; content: string } | null> {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept.join(",");

    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

    if (!file) {
      return null;
    }

    const content = await file.text();
    return { name: file.name, content };
  }

  supportsLinkedFile(): boolean {
    return typeof (window as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function";
  }

  async linkFile(suggestedName: string): Promise<{ filename: string } | null> {
    const anyWindow = window as unknown as {
      showSaveFilePicker?: (options: unknown) => Promise<{
        name?: string;
      } & {
        createWritable: () => Promise<{ write: (chunk: Blob | Uint8Array | string) => Promise<void>; close: () => Promise<void> }>;
      }>;
    };
    if (typeof anyWindow.showSaveFilePicker !== "function") {
      return null;
    }

    const handle = await anyWindow.showSaveFilePicker({
      suggestedName,
      types: [{
        description: "Proyecto tipografia",
        accept: { "application/json": [".json"] },
      }],
    });
    this.linkedHandle = handle;
    this.linkedFilename = handle.name ?? suggestedName;
    return { filename: this.linkedFilename };
  }

  async saveLinkedFile(content: Blob | Uint8Array | string): Promise<{ filename: string } | null> {
    const handle = this.linkedHandle as {
      createWritable?: () => Promise<{ write: (chunk: Blob | Uint8Array | string) => Promise<void>; close: () => Promise<void> }>;
      name?: string;
    } | null;
    if (!handle || typeof handle.createWritable !== "function") {
      return null;
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    const filename = handle.name ?? this.linkedFilename ?? "proyecto-tipografia.json";
    this.linkedFilename = filename;
    return { filename };
  }

  getLinkedFilename(): string | null {
    return this.linkedFilename || null;
  }
}
