import type { FileSystemGateway } from "../../domain/ports";

interface StoredFile {
  filename: string;
  content: Blob | Uint8Array | string;
}

function cloneContent(content: Blob | Uint8Array | string): Blob | Uint8Array | string {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof Uint8Array) {
    return new Uint8Array(content);
  }
  return content;
}

export class InMemoryFileSystemGateway implements FileSystemGateway {
  private readonly savedFiles = new Map<string, StoredFile>();
  private pickedFile: { name: string; content: string } | null = null;

  async saveFile(filename: string, content: Blob | Uint8Array | string): Promise<void> {
    this.savedFiles.set(filename, {
      filename,
      content: cloneContent(content),
    });
  }

  async pickFile(_accept: string[]): Promise<{ name: string; content: string } | null> {
    return this.pickedFile ? { ...this.pickedFile } : null;
  }

  setPickedFile(file: { name: string; content: string } | null): void {
    this.pickedFile = file ? { ...file } : null;
  }

  getSavedFile(filename: string): StoredFile | null {
    const file = this.savedFiles.get(filename);
    if (!file) {
      return null;
    }
    return {
      filename: file.filename,
      content: cloneContent(file.content),
    };
  }
}
