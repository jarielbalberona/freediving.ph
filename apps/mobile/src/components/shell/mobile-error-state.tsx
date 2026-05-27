import { Text, View } from "react-native";

type MobileErrorStateProps = {
  message: string;
  title?: string;
};

export function MobileErrorState({
  message,
  title = "Something went wrong",
}: MobileErrorStateProps) {
  return (
    <View className="border-y border-destructive/20 bg-destructive/5 px-4 py-5">
      <Text className="text-base font-semibold text-destructive">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-muted-foreground" selectable>
        {message}
      </Text>
    </View>
  );
}
