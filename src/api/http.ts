export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorPayload;

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = {
    ok: true,
    data,
  };
  return Response.json(body, { status });
}

export function error(status: number, code: string, message: string, details?: unknown): Response {
  const body: ApiErrorPayload = {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };
  return Response.json(body, { status });
}

export function asHttpError(value: unknown): HttpError {
  if (value instanceof HttpError) {
    return value;
  }

  if (value instanceof Error) {
    return new HttpError(500, "INTERNAL_ERROR", value.message);
  }

  return new HttpError(500, "INTERNAL_ERROR", "Unexpected internal error.");
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export function requireObject(value: unknown, message = "Body must be a JSON object."): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", message);
  }
  return value as Record<string, unknown>;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "INVALID_FIELD", `Field "${field}" must be a non-empty string.`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_FIELD", `Field "${field}" must be a string when provided.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new HttpError(400, "INVALID_FIELD", `Field "${field}" must be a finite number when provided.`);
  }
  return value;
}

export function queryString(url: URL, key: string): string {
  const value = url.searchParams.get(key);
  if (!value || value.trim().length === 0) {
    throw new HttpError(400, "MISSING_QUERY", `Query parameter "${key}" is required.`);
  }
  return value.trim();
}

export async function withErrorBoundary(handler: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await handler();
  } catch (errorValue) {
    const err = asHttpError(errorValue);
    return error(err.status, err.code, err.message, err.details);
  }
}
