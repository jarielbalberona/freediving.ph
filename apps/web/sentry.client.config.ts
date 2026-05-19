import * as Sentry from "@sentry/nextjs";

const glitchtipDsn =
  "https://04521819cef742259f2c8c9321285550@app.glitchtip.com/23656";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || glitchtipDsn;
const environment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.SENTRY_ENVIRONMENT ||
  process.env.NODE_ENV;
const release = process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE;
const enableLocal =
  process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOCAL === "true" ||
  process.env.SENTRY_ENABLE_LOCAL === "true";
const enabled = Boolean(dsn) && (process.env.NODE_ENV === "production" || enableLocal);

if (enabled) {
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: 0.01,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
