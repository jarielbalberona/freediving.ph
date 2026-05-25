import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function NotificationsScreen() {
  return (
    <FeatureReadinessScreen
      description="Notifications will start with in-app reads and mark-read actions. Push registration is intentionally later."
      integrationLabel="notifications"
      title="Notifications"
    />
  );
}
