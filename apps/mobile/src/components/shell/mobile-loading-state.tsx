import { ActivityIndicator, Text, View } from "react-native";

type MobileLoadingStateProps = {
  message?: string;
};

export function MobileLoadingState({
  message = "Loading",
}: MobileLoadingStateProps) {
  return (
    <View className="flex-row items-center justify-center gap-3 bg-background px-4 py-6">
      <ActivityIndicator color="#0677A8" />
      <Text className="text-sm text-muted-foreground">{message}</Text>
    </View>
  );
}
