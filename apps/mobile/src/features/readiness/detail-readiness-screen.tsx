import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import {
  MobileCard,
  MobileEmptyState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";

type DetailReadinessScreenProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function DetailReadinessScreen({
  description,
  eyebrow,
  title,
}: DetailReadinessScreenProps) {
  const params = useLocalSearchParams();
  const routeValue = String(params.slug ?? params.username ?? "");

  return (
    <MobileScrollScreen subtitle={eyebrow} title={title}>
      <MobileSection description={description} title="Route ready">
        <MobileEmptyState
          description="This detail route exists so navigation and shell behavior are ready before feature data is wired."
          title="Ready for integration"
        />
      </MobileSection>
      {routeValue ? (
        <MobileCard>
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
              Route parameter
            </Text>
            <Text className="text-sm text-foreground" selectable>
              {routeValue}
            </Text>
          </View>
        </MobileCard>
      ) : null}
    </MobileScrollScreen>
  );
}
