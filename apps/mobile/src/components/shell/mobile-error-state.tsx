import { Text, View } from "react-native";

import { MobileCard } from "@/components/shell/mobile-card";

type MobileErrorStateProps = {
  message: string;
  title?: string;
};

export function MobileErrorState({
  message,
  title = "Something went wrong",
}: MobileErrorStateProps) {
  return (
    <MobileCard>
      <View className="gap-2">
        <Text className="text-base font-semibold text-destructive">{title}</Text>
        <Text className="text-sm leading-6 text-muted-foreground" selectable>
          {message}
        </Text>
      </View>
    </MobileCard>
  );
}
