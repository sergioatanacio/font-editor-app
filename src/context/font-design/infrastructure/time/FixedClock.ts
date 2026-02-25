import type { Clock } from "../../domain/ports";

export class FixedClock implements Clock {
  private current: Date;

  constructor(initialIso: string) {
    this.current = new Date(initialIso);
  }

  now(): string {
    return this.current.toISOString();
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
