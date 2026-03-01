import type { DomainEvent, DomainEventHandler } from "../../domain/ports";

export class ConsoleDomainEventLogger implements DomainEventHandler {
  canHandle(_event: DomainEvent): _event is DomainEvent {
    return true;
  }

  async handle(event: DomainEvent): Promise<void> {
    console.info("[EVENT_BUS][EVENT]", {
      name: event.name,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      version: event.version,
      payload: event.payload,
    });
  }
}
