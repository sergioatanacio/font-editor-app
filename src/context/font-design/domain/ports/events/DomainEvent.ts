export interface DomainEvent<TPayload = unknown> {
  name: string;
  occurredAt: string;
  version: number;
  aggregateId?: string;
  payload: TPayload;
  metadata?: Readonly<Record<string, unknown>>;
}

