import { Text, View } from "react-native";

type MobileEmptyStateProps = {
  description: string;
  title: string;
};

export function MobileEmptyState({ description, title }: MobileEmptyStateProps) {
  return (
    <View className="border-y border-border/60 bg-background px-4 py-6">
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-muted-foreground">{description}</Text>
    </View>
  );
}
