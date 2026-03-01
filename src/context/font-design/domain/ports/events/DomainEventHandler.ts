import type { DomainEvent } from "./DomainEvent";

export interface DomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  canHandle(event: DomainEvent): event is TEvent;
  handle(event: TEvent): Promise<void>;
}

