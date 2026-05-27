import { Text, View } from "react-native";

type ProfileDetailRowProps = {
  label: string;
  value?: number | string;
};

export function ProfileDetailRow({ label, value }: ProfileDetailRowProps) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <View className="border-b border-border/60 bg-background px-4 py-3">
      <Text className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-1 text-sm leading-6 text-foreground">{String(value)}</Text>
    </View>
  );
}
