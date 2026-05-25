import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function ProfileScreen() {
  return (
    <FeatureReadinessScreen
      description="Profile will reuse the existing me/public profile contracts."
      integrationLabel="profiles/media"
      title="Profile"
    />
  );
}
