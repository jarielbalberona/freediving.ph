import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { HomeActivityCard } from "@/features/home-feed/components/home-activity-card";
import { useHomeActivityFeedQuery } from "@/features/home-feed/hooks/use-home-activity-feed-query";
import { toHomeActivityCardModel } from "@/features/home-feed/lib/activity-card-model";

export function HomeScreen() {
  const feedQuery = useHomeActivityFeedQuery();
  const items = feedQuery.data?.items.map(toHomeActivityCardModel) ?? [];

  return (
    <MobileScrollScreen subtitle="Community activity" title="Home">
      <MobileSection
        description="See the latest public updates from divers, Chika, events, dive spots, and buddy signals."
        title="Latest from the community"
      >
        {feedQuery.isLoading ? (
          <MobileLoadingState message="Loading community activity." />
        ) : null}

        {feedQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Community activity is taking longer than expected. Try again in a moment."
              title="Activity is unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void feedQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!feedQuery.isLoading && !feedQuery.error && items.length === 0 ? (
          <MobileEmptyState
            description="Check back as divers share updates, events, and dive reports."
            title="No community activity yet"
          />
        ) : null}

        {!feedQuery.isLoading && !feedQuery.error && items.length > 0 ? (
          <View className="gap-3">
            {items.map((item) => (
              <HomeActivityCard key={item.id} item={item} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
