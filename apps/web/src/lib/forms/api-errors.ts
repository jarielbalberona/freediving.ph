import type { ApiError } from "@freediving.ph/types";
import type {
  FieldValues,
  Path,
  UseFormReturn,
  UseFormSetError,
} from "react-hook-form";
import { getApiError } from "@/lib/http/api-error";

export type ApiFieldMap<TFieldValues extends FieldValues> = Partial<
  Record<string, Path<TFieldValues>>
>;

export type ApplyApiErrorsOptions<TFieldValues extends FieldValues> = {
  fieldMap?: ApiFieldMap<TFieldValues>;
  fallbackMessage?: string;
};

export type ApplyApiErrorsResult = {
  fieldErrorCount: number;
  globalMessages: string[];
  apiError: ApiError;
};

type SetErrorTarget<TFieldValues extends FieldValues> =
  | UseFormSetError<TFieldValues>
  | Pick<UseFormReturn<TFieldValues>, "setError">;

const defaultFallbackMessage = "Something went wrong. Please try again.";

function pathKey(path: (string | number)[] | undefined): string {
  if (!path || path.length === 0) return "";
  return path.map(String).join(".");
}

function resolveFormField<TFieldValues extends FieldValues>(
  issuePath: (string | number)[] | undefined,
  fieldMap: ApiFieldMap<TFieldValues> | undefined,
): Path<TFieldValues> | null {
  const key = pathKey(issuePath);
  if (!key) return null;

  const mapped = fieldMap?.[key];
  if (mapped) return mapped;

  return key as Path<TFieldValues>;
}

function getSetError<TFieldValues extends FieldValues>(
  target: SetErrorTarget<TFieldValues>,
): UseFormSetError<TFieldValues> {
  return typeof target === "function" ? target : target.setError;
}

export function getApiValidationErrors(error: unknown) {
  return getApiError(error).issues ?? [];
}

export function mapApiValidationErrorsToFormErrors<
  TFieldValues extends FieldValues,
>(error: unknown, options: ApplyApiErrorsOptions<TFieldValues> = {}) {
  const apiError = getApiError(error);
  const issues = apiError.issues ?? [];
  const mapped = [];
  const globalMessages: string[] = [];

  for (const issue of issues) {
    const field = resolveFormField(issue.path, options.fieldMap);
    if (field) {
      mapped.push({
        field,
        message: issue.message,
        code: issue.code,
      });
    } else {
      globalMessages.push(issue.message);
    }
  }

  if (mapped.length === 0 && globalMessages.length === 0) {
    globalMessages.push(
      apiError.message || options.fallbackMessage || defaultFallbackMessage,
    );
  }

  return {
    apiError,
    fieldErrors: mapped,
    globalMessages,
  };
}

export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  target: SetErrorTarget<TFieldValues>,
  error: unknown,
  options: ApplyApiErrorsOptions<TFieldValues> = {},
): ApplyApiErrorsResult {
  const setError = getSetError(target);
  const { apiError, fieldErrors, globalMessages } =
    mapApiValidationErrorsToFormErrors<TFieldValues>(error, options);

  for (const fieldError of fieldErrors) {
    setError(fieldError.field, {
      type: fieldError.code || "server",
      message: fieldError.message,
    });
  }

  return {
    apiError,
    fieldErrorCount: fieldErrors.length,
    globalMessages,
  };
}
