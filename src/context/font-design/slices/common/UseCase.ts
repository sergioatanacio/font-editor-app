import type { AppError } from "../../shared/errors/AppError";
import type { Result } from "../../shared/result/Result";

export interface UseCase<I, O, E = AppError> {
  execute(input: I): Promise<Result<O, E>>;
}
