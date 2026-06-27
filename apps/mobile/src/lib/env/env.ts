import { Platform } from "react-native";

type RequiredEnvKey =
  | "EXPO_PUBLIC_API_BASE_URL"
  | "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY";

const requiredEnvKeys: RequiredEnvKey[] = [
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_API_BASE_URL",
];

const normalizeBaseUrl = (value: string | undefined) =>
  (value ?? "").trim().replace(/\/+$/, "");

const defaultApiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const webApiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_WEB);

const values = {
  apiBaseUrl: Platform.OS === "web" && webApiBaseUrl ? webApiBaseUrl : defaultApiBaseUrl,
  clerkPublishableKey: (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim(),
  sentryDsn: (process.env.EXPO_PUBLIC_SENTRY_DSN ?? "").trim(),
};

const missingRequiredEnv = requiredEnvKeys.filter((key) => {
  if (key === "EXPO_PUBLIC_API_BASE_URL") return values.apiBaseUrl.length === 0;
  if (key === "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") {
    return values.clerkPublishableKey.length === 0;
  }
  return false;
});

export const env = {
  ...values,
  isConfigured: missingRequiredEnv.length === 0,
  missingRequiredEnv,
};

export type MobileEnv = typeof env;
