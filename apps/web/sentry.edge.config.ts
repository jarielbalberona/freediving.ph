import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const enableLocal =
  process.env.SENTRY_ENABLE_LOCAL === "true" ||
  process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOCAL === "true";
const enabled = Boolean(dsn) && (process.env.NODE_ENV === "production" || enableLocal);

if (enabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
