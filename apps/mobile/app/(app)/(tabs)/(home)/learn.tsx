import { router } from "expo-router";
import { Text, View } from "react-native";

import { MobileScrollScreen, MobileSection } from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";

const guides = [
  {
    description:
      "Find instruction, safer first sessions, local water, and steady ways to keep learning.",
    slug: "how-to-start-freediving-in-the-philippines",
    title: "How to start freediving",
  },
  {
    description:
      "Never dive alone, agree on limits, avoid performance chasing, and respect conditions.",
    slug: "freediving-safety-basics",
    title: "Safety basics",
  },
  {
    description:
      "A practical checklist for first sessions, training days, and community dives.",
    slug: "what-to-bring-to-a-freediving-session",
    title: "What to bring",
  },
  {
    description:
      "Understand common certification paths and how to compare schools and instructors.",
    slug: "freediving-certifications-philippines",
    title: "Certifications",
  },
  {
    description:
      "Plan around seasonality, conditions, local advice, and conservative expectations.",
    slug: "best-time-to-freedive-in-the-philippines",
    title: "Best time to freedive",
  },
];

export default function LearnRoute() {
  return (
    <MobileScrollScreen subtitle="Guides and practical context" title="Learn">
      <MobileSection
        description="Native summaries for mobile. Full SEO pages remain web-owned."
        title="Guides"
      >
        <View className="gap-3">
          {guides.map((guide) => (
            <View
              className="gap-2 rounded-2xl border border-border bg-card p-4"
              key={guide.slug}
            >
              <Text className="text-lg font-semibold text-foreground">
                {guide.title}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {guide.description}
              </Text>
            </View>
          ))}
        </View>
      </MobileSection>
      <MobileSection title="Community tools">
        <View className="flex-row flex-wrap gap-2">
          <MobileButton
            variant="secondary"
            onPress={() => router.push("/(app)/(tabs)/(home)/explore")}
          >
            Explore sites
          </MobileButton>
          <MobileButton
            variant="secondary"
            onPress={() => router.push("/(app)/(tabs)/(home)/schools")}
          >
            Find courses
          </MobileButton>
          <MobileButton
            variant="secondary"
            onPress={() => router.push("/(app)/(tabs)/(home)/buddies")}
          >
            Find buddies
          </MobileButton>
        </View>
      </MobileSection>
    </MobileScrollScreen>
  );
}
