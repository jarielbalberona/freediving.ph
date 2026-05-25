import { ActivityIndicator, Text, View } from "react-native";

type MobileLoadingStateProps = {
  message?: string;
};

export function MobileLoadingState({
  message = "Loading",
}: MobileLoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-phone items-center gap-3 rounded-2xl border border-border bg-card p-5">
        <ActivityIndicator color="#0677A8" />
        <Text className="text-center text-sm text-muted-foreground">{message}</Text>
      </View>
    </View>
  );
}
