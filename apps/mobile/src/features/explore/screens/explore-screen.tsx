import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function ExploreScreen() {
  return (
    <FeatureReadinessScreen
      description="Explore will start with read-only dive spot discovery before map and location features."
      integrationLabel="explore/dive-sites"
      title="Explore"
    />
  );
}
