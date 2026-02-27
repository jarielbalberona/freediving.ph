type ApiErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "SUSPENDED" | "READ_ONLY";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

export type ApiClientOptions = RequestInit & {
  token?: string | null;
};

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export const getApiBaseUrl = () => {
  const fallback = "http://localhost:4000";
  if (typeof window === "undefined") {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || fallback;
  }
  return process.env.NEXT_PUBLIC_API_URL || fallback;
};

export const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") {
    // This function should only be called on the client
    // For server-side usage, use apiServerClient from @/lib/api/server
    return null;
  }

  try {
    return (await window.Clerk?.session?.getToken()) || null;
  } catch {
    return null;
  }
};

const normalizePath = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
};

const toApiError = (
  status: number,
  payload: ApiErrorPayload | null,
): ApiClientError => {
  const codeFromPayload = payload?.error?.code;
  const messageFromPayload = payload?.error?.message;
  const knownCode: ApiErrorCode =
    status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN";

  return new ApiClientError({
    status,
    code: codeFromPayload || knownCode,
    message:
      messageFromPayload ||
      (status === 401 ? "authentication required" : "request forbidden"),
    details: payload?.error?.details,
  });
};

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const url = normalizePath(path);
  const headers = new Headers(options.headers);

  const token =
    options.token === undefined ? await getAuthToken() : options.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
  });

  const hasBody = response.status !== 204;
  const payload = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw toApiError(response.status, payload as ApiErrorPayload | null);
  }

  return payload as T;
}
