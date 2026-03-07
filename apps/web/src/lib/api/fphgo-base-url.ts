const FALLBACK_BASE_URL = "http://localhost:4000";

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, "");
};

const readClientBaseUrl = (): string => {
  const value = process.env.NEXT_PUBLIC_FPHGO_BASE_URL || FALLBACK_BASE_URL;
  return normalizeBaseUrl(value);
};

const readServerBaseUrl = (): string => {
  const value =
    process.env.FPHGO_BASE_URL ||
    process.env.NEXT_PUBLIC_FPHGO_BASE_URL ||
    FALLBACK_BASE_URL;
  return normalizeBaseUrl(value);
};

export const getFphgoBaseUrlClient = (): string => readClientBaseUrl();

export const getFphgoBaseUrlServer = (): string => readServerBaseUrl();

