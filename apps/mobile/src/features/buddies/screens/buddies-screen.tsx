import { FeatureReadinessScreen } from "@/features/readiness/feature-readiness-screen";

export function BuddiesScreen() {
  return (
    <FeatureReadinessScreen
      description="Buddy Finder will use shared buddy intent and preview contracts."
      integrationLabel="buddy intents"
      title="Buddies"
    />
  );
}
