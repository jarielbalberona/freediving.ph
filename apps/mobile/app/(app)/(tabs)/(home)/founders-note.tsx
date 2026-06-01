import { Text, View } from "react-native";

import { MobileScrollScreen, MobileSection } from "@/components/shell";

export default function FoundersNoteRoute() {
  return (
    <MobileScrollScreen
      subtitle="Built for the Philippine freediving community"
      title="Founder’s Note"
    >
      <MobileSection title="Why this exists">
        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text className="text-sm leading-5 text-muted-foreground">
            Freediving.ph helps people discover and contribute dive spots, tag
            places in posts, find buddies, join groups and events, and keep the
            local freediving community easier to find in one place.
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            The goal is not to replace real local communities. The goal is to
            make them easier to discover, support, and connect.
          </Text>
        </View>
      </MobileSection>
      <MobileSection title="What it helps with">
        <View className="gap-2 rounded-2xl border border-border bg-card p-4">
          {[
            "Discover dive sites and local condition reports.",
            "Find buddies, groups, schools, courses, and events.",
            "Share media with dive-site context.",
            "Build proof-based dive identity over time.",
          ].map((item) => (
            <Text className="text-sm text-muted-foreground" key={item}>
              {item}
            </Text>
          ))}
        </View>
      </MobileSection>
    </MobileScrollScreen>
  );
}
