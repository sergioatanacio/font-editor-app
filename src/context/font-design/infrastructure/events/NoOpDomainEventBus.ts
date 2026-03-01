import type { DomainEvent, DomainEventBus, DomainEventHandler } from "../../domain/ports";

export class NoOpDomainEventBus implements DomainEventBus {
  async publish(_event: DomainEvent): Promise<void> {}

  async publishAll(_events: readonly DomainEvent[]): Promise<void> {}

  subscribe(_handler: DomainEventHandler): () => void {
    return () => {};
  }
}
