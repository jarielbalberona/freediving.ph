import type { ApiError } from "@freediving.ph/types";

import { getMobileAuthToken } from "@/lib/auth";
import { env } from "@/lib/env";

type JsonBody = object | unknown[] | string | number | boolean;

export type FphgoRequestInit = Omit<RequestInit, "body"> & {
  auth?: "optional" | "required" | "none";
  authToken?: string | null;
  body?: BodyInit | JsonBody | null;
  idempotencyKey?: string;
};

export class FphgoApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly apiError?: ApiError;

  constructor(status: number, message: string, body: unknown, apiError?: ApiError) {
    super(message);
    this.name = "FphgoApiError";
    this.status = status;
    this.body = body;
    this.apiError = apiError;
  }
}

export const isAuthErrorStatus = (status: number) => status === 401 || status === 403;

const isBodyInit = (value: unknown): value is BodyInit =>
  typeof value === "string" ||
  value instanceof FormData ||
  value instanceof URLSearchParams ||
  value instanceof Blob ||
  value instanceof ArrayBuffer;

const resolveBody = (headers: Headers, body: FphgoRequestInit["body"]) => {
  if (body === undefined || body === null) {
    return body;
  }
  if (isBodyInit(body)) {
    return body;
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
};

const normalizeApiError = (body: unknown, status: number) => {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    body.error &&
    typeof body.error === "object"
  ) {
    const error = body.error as ApiError;
    return {
      apiError: error,
      message: error.message || `Request failed with ${status}`,
    };
  }

  return {
    apiError: undefined,
    message:
      status === 401
        ? "Authentication required"
        : status === 403
          ? "Permission denied"
          : `Request failed with ${status}`,
  };
};

export async function fphgoFetch<T>(path: string, init: FphgoRequestInit = {}) {
  if (!path.startsWith("/")) {
    throw new Error(`FPHGO path must be relative and start with "/": ${path}`);
  }

  const { auth, authToken, body: requestBody, idempotencyKey, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  const authMode = auth ?? "optional";
  const token =
    authMode === "none" ? null : (authToken ?? (await getMobileAuthToken()));

  if (authMode === "required" && !token) {
    throw new FphgoApiError(401, "Authentication required", null);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    body: resolveBody(headers, requestBody),
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const normalized = normalizeApiError(body, response.status);
    throw new FphgoApiError(
      response.status,
      normalized.message,
      body,
      normalized.apiError,
    );
  }

  return body as T;
}

export type HealthzResponse = {
  status: string;
  version?: string;
  commit?: string;
  build_time?: string;
};

export const fphgoHealth = () =>
  fphgoFetch<HealthzResponse>("/healthz", { auth: "none" });
