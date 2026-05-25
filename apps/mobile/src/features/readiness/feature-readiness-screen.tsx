import { Text, View } from "react-native";

import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { useFphgoHealthQuery } from "@/lib/query";

type FeatureReadinessScreenProps = {
  description: string;
  integrationLabel: string;
  title: string;
};

export function FeatureReadinessScreen({
  description,
  integrationLabel,
  title,
}: FeatureReadinessScreenProps) {
  const healthQuery = useFphgoHealthQuery();

  return (
    <MobileScrollScreen subtitle="Foundation ready" title={title}>
      <MobileSection
        description={description}
        title="Ready for contract-backed integration"
      >
        <MobileEmptyState
          description="This screen intentionally stops at the shell layer. Feature data wiring comes after the shared contracts are checked."
          title="Coming online"
        />
      </MobileSection>

      <MobileSection title="Source of truth">
        <MobileCard>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">{integrationLabel}</Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              Mobile should consume `services/fphgo` through `/v1` routes and shared contracts from
              `@freediving.ph/types`.
            </Text>
          </View>
        </MobileCard>
      </MobileSection>

      <MobileSection title="API readiness">
        {healthQuery.isError ? (
          <MobileErrorState
            message={
              healthQuery.error instanceof Error
                ? healthQuery.error.message
                : "Unable to reach fphgo health."
            }
            title="API health check unavailable"
          />
        ) : (
          <MobileCard>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                {healthQuery.isLoading ? "Checking fphgo" : "fphgo client wired"}
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {healthQuery.data?.status
                  ? `Service status: ${healthQuery.data.status}`
                  : "The app is configured. Live availability depends on the current service environment."}
              </Text>
            </View>
          </MobileCard>
        )}
      </MobileSection>
    </MobileScrollScreen>
  );
}
