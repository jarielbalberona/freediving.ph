import { AxiosError } from "axios";
import type { ApiError, ApiErrorIssue } from "@freediving.ph/types";

const toIssuePath = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((segment) => (typeof segment === "string" || typeof segment === "number" ? String(segment) : ""))
      .filter(Boolean)
      .join(".");
  }
  return "";
};

const toIssue = (value: unknown): ApiErrorIssue | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "Invalid value";
  const path = toIssuePath(record.path);
  const code = typeof record.code === "string" ? record.code : undefined;

  return {
    path,
    message,
    ...(code ? { code } : {}),
  };
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

    return {
      code: code.toLowerCase(),
      message,
      ...("details" in nested ? { details: nested.details } : {}),
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
