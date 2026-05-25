import { Text, View } from "react-native";

import { MobileCard } from "@/components/shell/mobile-card";

type MobileEmptyStateProps = {
  description: string;
  title: string;
};

export function MobileEmptyState({ description, title }: MobileEmptyStateProps) {
  return (
    <MobileCard>
      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm leading-6 text-muted-foreground">{description}</Text>
      </View>
    </MobileCard>
  );
}
