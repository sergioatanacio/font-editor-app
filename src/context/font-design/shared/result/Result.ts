export type Result<T, E> =
  | { ok: true; value: T; warnings?: readonly E[] }
  | { ok: false; error: E };
