import { AxiosError } from "axios";

type ApiErrorPayload = {
  message?: string;
  error?: {
    code?: string;
    details?: Array<{ field: string; message: string }>;
  };
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) return payload.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getApiErrorStatus = (error: unknown): number | null => {
  if (error instanceof AxiosError) {
    return error.response?.status ?? null;
  }
  return null;
};
