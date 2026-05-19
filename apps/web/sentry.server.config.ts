import * as Sentry from "@sentry/nextjs";

const glitchtipDsn =
  "https://04521819cef742259f2c8c9321285550@app.glitchtip.com/23656";
const dsn =
  process.env.SENTRY_DSN?.trim() ||
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
  glitchtipDsn;
const enableLocal =
  process.env.SENTRY_ENABLE_LOCAL === "true" ||
  process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOCAL === "true";
const enabled = Boolean(dsn) && (process.env.NODE_ENV === "production" || enableLocal);

if (enabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.01,
    sendDefaultPii: false,
  });
}
