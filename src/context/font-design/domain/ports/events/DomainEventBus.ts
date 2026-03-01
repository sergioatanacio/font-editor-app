import type { DomainEvent } from "./DomainEvent";
import type { DomainEventHandler } from "./DomainEventHandler";

export interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
  subscribe(handler: DomainEventHandler): () => void;
}

