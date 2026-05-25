import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { BuddyIntentCard } from "@/features/buddies/components/buddy-intent-card";
import { useBuddyFinderQuery } from "@/features/buddies/hooks/use-buddy-finder-query";

export function BuddiesScreen() {
  const buddiesQuery = useBuddyFinderQuery();
  const intents = buddiesQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Buddy Finder" title="Buddies">
      <MobileSection
        description="Find divers who have shared where and when they want to dive."
        title="Looking for a dive buddy"
      >
        {buddiesQuery.isLoading ? (
          <MobileLoadingState message="Loading buddy posts." />
        ) : null}

        {buddiesQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Buddy posts are taking longer than expected to load."
              title="Buddy Finder unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void buddiesQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!buddiesQuery.isLoading && !buddiesQuery.error && intents.length === 0 ? (
          <MobileEmptyState
            description="No buddy posts yet. Check back as divers share where and when they want to dive."
            title="No buddy posts yet"
          />
        ) : null}

        {!buddiesQuery.isLoading && !buddiesQuery.error && intents.length > 0 ? (
          <View className="gap-3">
            {intents.map((intent) => (
              <BuddyIntentCard intent={intent} key={intent.id} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
