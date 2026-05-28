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

const parseResponseBody = async (response: Response) => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);
};

const requestWithHeaders = async (
  path: string,
  requestInit: Omit<RequestInit, "body">,
  headers: Headers,
  requestBody: FphgoRequestInit["body"],
) => {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    body: resolveBody(headers, requestBody),
    headers,
  });

  const body = await parseResponseBody(response);
  return { response, body };
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

  const requestHeaders = new Headers(headers);
  if (idempotencyKey) {
    requestHeaders.set("Idempotency-Key", idempotencyKey);
  }
  const requestInitWithoutBody = {
    ...requestInit,
  } as Omit<RequestInit, "body">;

  const requestHeadersWithToken = new Headers(requestHeaders);
  if (token) {
    requestHeadersWithToken.set("Authorization", `Bearer ${token}`);
  }

  const withToken = authMode !== "none";
  const { response, body } = withToken
    ? await requestWithHeaders(path, requestInitWithoutBody, requestHeadersWithToken, requestBody)
    : await requestWithHeaders(path, requestInitWithoutBody, requestHeaders, requestBody);

  if (!response.ok) {
    if (
      response.status === 401 &&
      authMode === "optional" &&
      !authToken &&
      token
    ) {
      const unauthenticated = await requestWithHeaders(path, requestInitWithoutBody, requestHeaders, requestBody);

      if (unauthenticated.response.ok) {
        return unauthenticated.body as T;
      }

      const retryError = normalizeApiError(
        unauthenticated.body,
        unauthenticated.response.status,
      );
      throw new FphgoApiError(
        unauthenticated.response.status,
        retryError.message,
        unauthenticated.body,
        retryError.apiError,
      );
    }

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
