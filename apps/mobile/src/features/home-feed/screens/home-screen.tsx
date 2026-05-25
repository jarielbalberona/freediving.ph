import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function HomeScreen() {
  return (
    <FeatureReadinessScreen
      description="Home will use the same feed and activity contracts as the web app."
      integrationLabel="feed/activity"
      title="Home"
    />
  );
}
