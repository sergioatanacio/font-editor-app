export type ActionResult<TEvent> =
  | { ok: true; emit: TEvent }
  | { ok: false; emit: TEvent };
