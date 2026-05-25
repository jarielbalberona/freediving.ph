import { Text, View } from "react-native";

type ExploreDetailRowProps = {
  label: string;
  value?: string;
};

export function ExploreDetailRow({ label, value }: ExploreDetailRowProps) {
  return (
    <View className="gap-1 rounded-xl border border-border bg-card p-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</Text>
      <Text className="text-sm leading-6 text-muted-foreground">
        {value && value.trim() !== "" ? value : "Not listed yet"}
      </Text>
    </View>
  );
}
