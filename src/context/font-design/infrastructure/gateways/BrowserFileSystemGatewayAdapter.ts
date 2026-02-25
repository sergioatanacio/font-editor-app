import type { FileSystemGateway } from "../../domain/ports";

export class BrowserFileSystemGatewayAdapter implements FileSystemGateway {
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
}
