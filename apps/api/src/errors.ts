import type { ApiErrorCode } from "@uniblox/shared";

/** Domain error that the error middleware maps to a structured HTTP response. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
