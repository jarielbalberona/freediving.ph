import { AxiosError } from "axios";
import type { ApiError, ApiErrorIssue, RateLimitDetails } from "@freediving.ph/types";

const toIssuePath = (value: unknown): (string | number)[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (segment): segment is string | number =>
        typeof segment === "string" || typeof segment === "number",
    );
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
};

const toIssue = (value: unknown): ApiErrorIssue | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "Invalid value";
  const path = toIssuePath(record.path);
  const code = typeof record.code === "string" ? record.code : "unknown";

  return { path, code, message };
};

const toDetails = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const fallbackFromStatus = (status: number | null | undefined): Pick<ApiError, "code" | "message"> => {
  if (status === 401) return { code: "unauthenticated", message: "authentication required" };
  if (status === 403) return { code: "forbidden", message: "request forbidden" };
  if (status === 404) return { code: "not_found", message: "resource not found" };
  if (status === 422 || status === 400) return { code: "validation_error", message: "Invalid request" };
  return { code: "request_failed", message: "request failed" };
};

export const toApiError = (payload: unknown, status?: number | null): ApiError => {
  const fallback = fallbackFromStatus(status);

  if (payload && typeof payload === "object") {
    const direct = payload as Record<string, unknown>;
    const nested =
      "error" in direct && direct.error && typeof direct.error === "object"
        ? (direct.error as Record<string, unknown>)
        : direct;

    const code = typeof nested.code === "string" ? nested.code : fallback.code;
    const message =
      typeof nested.message === "string" && nested.message.length > 0
        ? nested.message
        : fallback.message;

    const rawIssues = Array.isArray(nested.issues) ? nested.issues : undefined;
    const issues = rawIssues
      ?.map(toIssue)
      .filter((issue): issue is ApiErrorIssue => issue !== null);
    const details = toDetails(nested.details);

    return {
      code: code.toLowerCase(),
      message,
      ...(details ? { details } : {}),
      ...(issues && issues.length > 0 ? { issues } : {}),
    };
  }

  return {
    code: fallback.code,
    message: fallback.message,
  };
};

export const getApiError = (error: unknown): ApiError => {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "FphgoFetchError" &&
    "apiError" in error
  ) {
    const apiError = (error as { apiError?: unknown }).apiError;
    if (apiError && typeof apiError === "object") {
      return apiError as ApiError;
    }
  }

  if (error instanceof AxiosError) {
    return toApiError(error.response?.data, error.response?.status ?? null);
  }

  if (error instanceof Error && error.message) {
    return { code: "request_failed", message: error.message };
  }

  return { code: "request_failed", message: "request failed" };
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const parsed = getApiError(error);
  return parsed.message || fallback;
};

export const getApiErrorStatus = (error: unknown): number | null => {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "FphgoFetchError" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  if (error instanceof AxiosError) {
    return error.response?.status ?? null;
  }
  return null;
};

export const getRateLimitDetails = (error: unknown): RateLimitDetails | null => {
  const parsed = getApiError(error);
  if (parsed.code !== "rate_limited" || !parsed.details || typeof parsed.details !== "object") return null;
  const details = parsed.details as Record<string, unknown>;
  const windowSeconds = Number(details.window_seconds);
  const retryAfterSeconds = Number(details.retry_after_seconds);
  if (!Number.isFinite(windowSeconds) || !Number.isFinite(retryAfterSeconds)) return null;
  return {
    window_seconds: Math.max(1, Math.floor(windowSeconds)),
    retry_after_seconds: Math.max(1, Math.floor(retryAfterSeconds)),
  };
};

export const getRateLimitMessage = (error: unknown, fallback: string): string => {
  const parsed = getApiError(error);
  if (parsed.code !== "rate_limited") return getApiErrorMessage(error, fallback);
  const details = getRateLimitDetails(error);
  if (!details) return parsed.message || fallback;
  return `Rate limit reached. Try again in ${details.retry_after_seconds}s.`;
};
