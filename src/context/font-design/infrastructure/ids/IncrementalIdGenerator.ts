import type { IdGenerator } from "../../domain/ports";

export class IncrementalIdGenerator implements IdGenerator {
  private counter: number;
  private readonly prefix: string;

  constructor(startAt = 1, prefix = "id") {
    this.counter = startAt;
    this.prefix = prefix;
  }

  nextId(): string {
    const id = `${this.prefix}-${this.counter}`;
    this.counter += 1;
    return id;
  }
}
