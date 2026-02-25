import type { IdGenerator } from "../../domain/ports";

export class WebCryptoIdGeneratorAdapter implements IdGenerator {
  nextId(): string {
    return crypto.randomUUID();
  }
}
