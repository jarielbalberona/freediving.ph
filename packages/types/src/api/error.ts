export type ApiErrorIssue = {
  path: string;
  message: string;
  code?: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  issues?: ApiErrorIssue[];
};

export type ApiErrorEnvelope = {
  error: ApiError;
};
