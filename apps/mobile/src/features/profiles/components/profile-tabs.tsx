import { Pressable, Text, View } from "react-native";

type ProfileTab = "posts" | "badges" | "diving";

const profileTabs: Array<{ label: string; value: ProfileTab }> = [
  { label: "Posts", value: "posts" },
  { label: "Badges", value: "badges" },
  { label: "Diving", value: "diving" },
];

export function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-full border border-border/70">
      {profileTabs.map((tab) => (
        <Pressable
          key={tab.value}
          accessibilityLabel={`Show ${tab.label.toLowerCase()}`}
          accessibilityRole="button"
          className={`flex-1 items-center py-2.5 ${
            activeTab === tab.value ? "bg-secondary" : "bg-transparent"
          }`}
          onPress={() => onChange(tab.value)}
        >
          <Text
            className={`text-sm font-semibold ${
              activeTab === tab.value ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export type { ProfileTab };
