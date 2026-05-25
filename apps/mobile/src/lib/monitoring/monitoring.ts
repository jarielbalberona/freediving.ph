import * as Sentry from "@sentry/react-native";

import { env } from "@/lib/env";

let monitoringInitialized = false;

export function initializeMonitoring() {
  if (monitoringInitialized || !env.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    enabled: !__DEV__,
    tracesSampleRate: 0.1,
  });
  monitoringInitialized = true;
}

export { Sentry };
