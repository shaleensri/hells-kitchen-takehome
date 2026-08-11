/**
 * Error envelope + Express error-handling middleware — PLAN.md §3.10:
 * `{ "error": { "code": string, "message": string } }` with correct HTTP
 * status codes on every endpoint, not ad hoc per-route error shapes.
 */
import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@hells-kitchen/shared";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

/** 400 — malformed/invalid query params (§3.10: sort/order are strict enums). */
export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, "BAD_REQUEST", message);
  }
}

/** 404 — unknown recipe ID, or no matching route. */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, "NOT_FOUND", message);
  }
}

/** 429 — per-IP rate limit exceeded on the LLM endpoint (§3.11). */
export class TooManyRequestsError extends ApiError {
  constructor(message: string) {
    super(429, "RATE_LIMITED", message);
  }
}

/** 503 — feature intentionally disabled (e.g. OPENAI_API_KEY not configured,
 * §3.3). Distinct from a 500: this is an expected, fail-soft state, not a bug. */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string) {
    super(503, "SERVICE_UNAVAILABLE", message);
  }
}

/** 502 — the upstream LLM provider errored or returned something unusable. */
export class BadGatewayError extends ApiError {
  constructor(message: string) {
    super(502, "UPSTREAM_ERROR", message);
  }
}

/** 504 — the upstream LLM provider didn't respond within the timeout (§3.11). */
export class GatewayTimeoutError extends ApiError {
  constructor(message: string) {
    super(504, "UPSTREAM_TIMEOUT", message);
  }
}

/**
 * Express error-handling middleware (4-arg signature required — that's how
 * Express identifies it as an error handler, not a regular middleware).
 * Route handlers can just `throw` an ApiError synchronously; Express 4
 * forwards synchronous throws to this automatically.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json(err.toBody());
    return;
  }
  console.error("[unhandled error]", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
  });
}
