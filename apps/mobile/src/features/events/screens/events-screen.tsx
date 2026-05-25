import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function EventsScreen() {
  return (
    <FeatureReadinessScreen
      description="Events will begin with list and detail surfaces before joins, passes, and payments."
      integrationLabel="events"
      title="Events"
    />
  );
}
