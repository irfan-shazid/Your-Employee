import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An error with a stable machine-readable `code`, rendered as `{ error: { code, message, details } }`. */
export class ApiError extends HTTPException {
  readonly code: string;
  readonly details?: unknown;

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(status, { message });
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "Please sign in to continue") => new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You don't have access to this", code = "FORBIDDEN") => new ApiError(403, code, message);
export const notFound = (message = "Not found") => new ApiError(404, "NOT_FOUND", message);
export const conflict = (message: string, code = "CONFLICT") => new ApiError(409, code, message);
