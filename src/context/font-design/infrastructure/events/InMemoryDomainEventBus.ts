import type { DomainEvent, DomainEventBus, DomainEventHandler } from "../../domain/ports";

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Set<DomainEventHandler>();

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers) {
      if (!handler.canHandle(event)) {
        continue;
      }
      try {
        await handler.handle(event);
      } catch (error) {
        console.error("[EVENT_BUS][HANDLER_ERROR]", {
          event: event.name,
          handler: handler.constructor?.name ?? "anonymous",
          cause: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(handler: DomainEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
