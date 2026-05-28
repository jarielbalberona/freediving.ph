import { Pressable, Text, View } from "react-native";

type ProfileTab = "posts" | "diving";

export function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-full border border-border/70">
      <Pressable
        accessibilityLabel="Show posts"
        accessibilityRole="button"
        className={`flex-1 items-center py-2.5 ${
          activeTab === "posts" ? "bg-secondary" : "bg-transparent"
        }`}
        onPress={() => onChange("posts")}
      >
        <Text
          className={`text-sm font-semibold ${
            activeTab === "posts" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Posts
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Show diving"
        accessibilityRole="button"
        className={`flex-1 items-center py-2.5 ${
          activeTab === "diving" ? "bg-secondary" : "bg-transparent"
        }`}
        onPress={() => onChange("diving")}
      >
        <Text
          className={`text-sm font-semibold ${
            activeTab === "diving" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Diving
        </Text>
      </Pressable>
    </View>
  );
}

export type { ProfileTab };
