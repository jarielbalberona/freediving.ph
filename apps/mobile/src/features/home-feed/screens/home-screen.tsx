import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { HomeActivityCard } from "@/features/home-feed/components/home-activity-card";
import { useFeedActionMutation } from "@/features/home-feed/hooks/use-feed-action-mutation";
import { useHomeActivityFeedQuery } from "@/features/home-feed/hooks/use-home-activity-feed-query";
import { toHomeActivityCardModel } from "@/features/home-feed/lib/activity-card-model";

export function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const feedQuery = useHomeActivityFeedQuery();
  const feedAction = useFeedActionMutation();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const items = feedQuery.data?.items ?? [];

  const requireSignedIn = () => {
    if (!isLoaded) {
      setActionMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setActionMessage("Sign in to react to community activity.");
      return false;
    }
    setActionMessage(undefined);
    return true;
  };

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
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            {items.map((item) => {
              const card = toHomeActivityCardModel(item);
              return (
                <HomeActivityCard
                  actionsDisabled={feedAction.isPending}
                  key={item.id}
                  item={card}
                  onChikaVote={
                    card.cardType === "chika"
                      ? (reaction) =>
                          requireSignedIn()
                            ? feedAction.mutate({
                                actionType: "chika_vote",
                                item,
                                reaction,
                              })
                            : undefined
                      : undefined
                  }
                  onMediaLike={
                    card.cardType === "media_post"
                      ? () =>
                          requireSignedIn()
                            ? feedAction.mutate({
                                actionType: "media_like",
                                item,
                                liked: Boolean(card.media?.viewerHasLiked),
                              })
                            : undefined
                      : undefined
                  }
                  onNotInterested={() =>
                    requireSignedIn()
                      ? feedAction.mutate({ actionType: "not_interested", item })
                      : undefined
                  }
                />
              );
            })}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
