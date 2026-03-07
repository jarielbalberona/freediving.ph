export type ApiErrorIssue = {
  path: (string | number)[];
  code: string;
  message: string;
};

export type RateLimitDetails = {
  window_seconds: number;
  retry_after_seconds: number;
};

export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
  issues?: ApiErrorIssue[];
  details?: Record<string, unknown> | RateLimitDetails;
};

export type ApiErrorEnvelope = {
  error: ApiError;
};
