import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";
import { toApiError } from "@/lib/http/api-error";
import type { ApiError } from "@freediving.ph/types";

type JsonObject = Record<string, unknown>;

declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}

export type FphgoFetchInit = Omit<RequestInit, "body"> & {
  auth?: "wait" | "ready-only" | "none";
  body?: BodyInit | JsonObject | null;
  perfLabel?: string;
  token?: string | null;
};

export class FphgoFetchError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly apiError: ApiError;

  constructor(params: {
    status: number;
    body: unknown;
    message: string;
    apiError: ApiError;
  }) {
    super(params.message);
    this.name = "FphgoFetchError";
    this.status = params.status;
    this.body = params.body;
    this.apiError = params.apiError;
  }
}

type FetchDeps = {
  baseUrlProvider: () => string;
  tokenProvider: (mode?: ClientAuthMode) => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

const isBodyInit = (value: unknown): value is BodyInit => {
  if (typeof value === "string") return true;
  if (value instanceof URLSearchParams) return true;
  if (value instanceof FormData) return true;
  if (value instanceof Blob) return true;
  if (value instanceof ArrayBuffer) return true;
  if (value instanceof ReadableStream) return true;
  return false;
};

const assertV1Path = (path: string): void => {
  if (process.env.NODE_ENV === "development" && !path.startsWith("/v1/")) {
    throw new Error(`FPHGO path must start with /v1/: ${path}`);
  }
};

const resolveBody = (
  headers: Headers,
  body: FphgoFetchInit["body"],
): BodyInit | null | undefined => {
  if (body === undefined || body === null) return body;
  if (isBodyInit(body)) return body;
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
};

const currentPerfTime = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const logFphgoFetchPerf = (
  event: string,
  details: Record<string, unknown> = {},
) => {
  if (
    process.env.NODE_ENV !== "development" ||
    typeof console === "undefined"
  ) {
    return;
  }
  console.debug("[fphgo-fetch-perf]", event, details);
};

export const createFphgoFetcher = ({
  baseUrlProvider,
  tokenProvider,
  fetchImpl = fetch,
}: FetchDeps) => {
  return async <T>(path: string, init: FphgoFetchInit = {}): Promise<T> => {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      throw new Error("fphgoFetch only accepts relative API paths");
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    assertV1Path(normalizedPath);

    const {
      body: initBody,
      perfLabel,
      token: initToken,
      ...requestInit
    } = init;
    delete requestInit.auth;

    const headers = new Headers(requestInit.headers);
    const auth = init.auth ?? "wait";
    const startedAt = currentPerfTime();
    const tokenStartedAt = currentPerfTime();
    const token =
      initToken === undefined
        ? auth === "none"
          ? null
          : await tokenProvider(auth)
        : initToken;
    if (perfLabel) {
      logFphgoFetchPerf("auth_token_ready", {
        auth,
        durationMs: Math.round(currentPerfTime() - tokenStartedAt),
        label: perfLabel,
      });
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const resolvedBody = resolveBody(headers, initBody);
    const url = `${baseUrlProvider()}${normalizedPath}`;
    const requestStartedAt = currentPerfTime();
    const response = await fetchImpl(url, {
      ...requestInit,
      body: resolvedBody,
      headers,
      credentials: requestInit.credentials ?? "include",
    });
    if (perfLabel) {
      logFphgoFetchPerf("request_end", {
        durationMs: Math.round(currentPerfTime() - requestStartedAt),
        label: perfLabel,
        status: response.status,
        totalMs: Math.round(currentPerfTime() - startedAt),
      });
    }

    if (response.status === 204) {
      if (!response.ok) {
        const apiError = toApiError(null, response.status);
        throw new FphgoFetchError({
          status: response.status,
          body: null,
          message: apiError.message,
          apiError,
        });
      }
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const apiError = toApiError(body, response.status);
      throw new FphgoFetchError({
        status: response.status,
        body,
        message: apiError.message,
        apiError,
      });
    }

    return body as T;
  };
};

type ClientAuthMode = "wait" | "ready-only";

const getClerkTokenFromWindow = async (
  mode: ClientAuthMode = "wait",
): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  if (mode === "ready-only" && !window.Clerk?.session) return null;

  const start = Date.now();
  const waitLimitMs = 1500;
  while (Date.now() - start < waitLimitMs) {
    if (window.Clerk?.session) {
      break;
    }
    if (window.Clerk?.loaded) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  try {
    return (await window.Clerk?.session?.getToken()) || null;
  } catch {
    return null;
  }
};

const clientFetcher = createFphgoFetcher({
  baseUrlProvider: getFphgoBaseUrlClient,
  tokenProvider: getClerkTokenFromWindow,
});

export const fphgoFetchClient = <T>(path: string, init?: FphgoFetchInit) =>
  clientFetcher<T>(path, init);

export const getAuthToken = getClerkTokenFromWindow;
