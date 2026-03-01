import { describe, expect, it, vi } from "vitest";
import type { DomainEvent, DomainEventHandler } from "../../domain/ports";
import { InMemoryDomainEventBus } from "./InMemoryDomainEventBus";

class SpyHandler implements DomainEventHandler {
  readonly calls: DomainEvent[] = [];

  canHandle(_event: DomainEvent): _event is DomainEvent {
    return true;
  }

  async handle(event: DomainEvent): Promise<void> {
    this.calls.push(event);
  }
}

describe("InMemoryDomainEventBus", () => {
  it("publica eventos a handlers suscritos", async () => {
    const bus = new InMemoryDomainEventBus();
    const handler = new SpyHandler();
    bus.subscribe(handler);

    await bus.publish({
      name: "TestEvent",
      occurredAt: "2026-01-01T00:00:00.000Z",
      version: 1,
      payload: { ok: true },
    });

    expect(handler.calls).toHaveLength(1);
    expect(handler.calls[0]?.name).toBe("TestEvent");
  });

  it("deja de notificar luego de unsubscribe", async () => {
    const bus = new InMemoryDomainEventBus();
    const handler = new SpyHandler();
    const unsubscribe = bus.subscribe(handler);
    unsubscribe();

    await bus.publish({
      name: "TestEvent",
      occurredAt: "2026-01-01T00:00:00.000Z",
      version: 1,
      payload: {},
    });

    expect(handler.calls).toHaveLength(0);
  });

  it("continua con otros handlers si uno falla", async () => {
    const bus = new InMemoryDomainEventBus();
    const okHandler = new SpyHandler();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const failingHandler: DomainEventHandler = {
      canHandle: (_event: DomainEvent): _event is DomainEvent => true,
      async handle() {
        throw new Error("boom");
      },
    };

    bus.subscribe(failingHandler);
    bus.subscribe(okHandler);

    await bus.publish({
      name: "TestEvent",
      occurredAt: "2026-01-01T00:00:00.000Z",
      version: 1,
      payload: {},
    });

    expect(okHandler.calls).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
