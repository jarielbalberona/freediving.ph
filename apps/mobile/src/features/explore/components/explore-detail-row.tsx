import { Text, View } from "react-native";

type ExploreDetailRowProps = {
  label: string;
  value?: string;
};

export function ExploreDetailRow({ label, value }: ExploreDetailRowProps) {
  return (
    <View className="border-b border-border/60 bg-background px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</Text>
      <Text className="text-sm leading-6 text-muted-foreground">
        {value && value.trim() !== "" ? value : "Not listed yet"}
      </Text>
    </View>
  );
}
