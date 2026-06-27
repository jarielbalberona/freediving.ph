import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView } from "react-native";

type ProfileTab =
  | "posts"
  | "badges"
  | "diving"
  | "dive-memories"
  | "journey"
  | "passport";

const profileTabs: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: ProfileTab;
}> = [
  { icon: "grid-outline", label: "Posts", value: "posts" },
  { icon: "ribbon-outline", label: "Badges", value: "badges" },
  { icon: "water-outline", label: "Diving", value: "diving" },
  { icon: "map-outline", label: "Dive Memories", value: "dive-memories" },
  { icon: "git-branch-outline", label: "Dive Journey", value: "journey" },
  { icon: "id-card-outline", label: "Dive Passport", value: "passport" },
];

export const normalizeProfileTab = (
  value: string | string[] | undefined,
): ProfileTab => {
  const raw = Array.isArray(value) ? value[0] : value;
  switch (raw) {
    case "posts":
    case "badges":
    case "diving":
    case "dive-memories":
    case "journey":
    case "passport":
      return raw;
    default:
      return "posts";
  }
};

export function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
    >
      {profileTabs.map((tab) => {
        const active = activeTab === tab.value;
        return (
          <Pressable
            key={tab.value}
            accessibilityLabel={`Show ${tab.label.toLowerCase()}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-w-12 items-center rounded-full border px-3 py-2.5 ${
              active
                ? "border-primary bg-secondary"
                : "border-border/70 bg-transparent"
            }`}
            onPress={() => onChange(tab.value)}
          >
            <Ionicons
              color={active ? "#0A1F2E" : "#64748b"}
              name={tab.icon}
              size={20}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type { ProfileTab };
