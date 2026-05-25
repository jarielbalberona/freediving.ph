import { Text, View } from "react-native";

type EventDetailRowProps = {
  label: string;
  value?: string | number | null;
};

export function EventDetailRow({ label, value }: EventDetailRowProps) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View className="gap-1">
      <Text className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </Text>
      <Text className="text-sm leading-6 text-foreground">{String(value)}</Text>
    </View>
  );
}
