import { useAuth } from "@clerk/expo";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

import type { ActivityFeedItem } from "@freediving.ph/types";

import { USE_IOS_NATIVE_HEADER } from "@/components/shell/mobile-native-header";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { MobileFeedItemRenderer } from "@/features/home-feed/components/mobile-feed-item-renderer";
import { useFeedActionMutation } from "@/features/home-feed/hooks/use-feed-action-mutation";
import { useHomeActivityFeedQuery } from "@/features/home-feed/hooks/use-home-activity-feed-query";

export function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const feedQuery = useHomeActivityFeedQuery();
  const feedAction = useFeedActionMutation();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const items = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data],
  );
  const canUseFeedActions = isLoaded && Boolean(isSignedIn);
  const contentContainerStyle = useMemo(
    () => ({
      alignSelf: "center" as const,
      maxWidth: 460,
      paddingBottom: 32,
      paddingTop: USE_IOS_NATIVE_HEADER ? 0 : 16,
      width: "100%" as const,
    }),
    [],
  );

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

  const mutateFeedAction = useCallback(
    (payload: Parameters<typeof feedAction.mutate>[0]) =>
      feedAction.mutate(payload, {
        onError: (error) =>
          setActionMessage(
            error instanceof Error
              ? error.message
              : "That action did not go through. Try again.",
          ),
      }),
    [feedAction],
  );

  const renderHeader = () => (
    <View className="gap-0">
      {feedQuery.isLoading ? (
        <View className="px-6">
          <MobileLoadingState message="Loading community activity." />
        </View>
      ) : null}

      {feedQuery.error ? (
        <View className="gap-3 px-6">
          <MobileErrorState
            message="Community activity is taking longer than expected. Try again in a moment."
            title="Activity is unavailable"
          />
          <MobileButton
            variant="secondary"
            onPress={() => void feedQuery.refetch()}
          >
            Try again
          </MobileButton>
        </View>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.error && items.length === 0 ? (
        <View className="px-6">
          <MobileEmptyState
            description="Check back as divers share updates, events, and dive reports."
            title="No community activity yet"
          />
        </View>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.error && items.length > 0 ? (
        <View>
          {actionMessage ? (
            <Text className="px-4 pb-3 text-sm text-muted-foreground">
              {actionMessage}
            </Text>
          ) : null}
          {!canUseFeedActions ? (
            <Text className="px-4 pb-3 text-sm text-muted-foreground">
              Sign in to react to community activity.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderFooter = () =>
    feedQuery.isFetchingNextPage ? (
      <View className="px-6 py-4">
        <MobileLoadingState message="Loading more activity." />
      </View>
    ) : null;

  const renderItem = useCallback(
    ({ item }: { item: ActivityFeedItem }) => (
      <MobileFeedItemRenderer
        actionsDisabled={!canUseFeedActions || feedAction.isPending}
        item={item}
        onChikaVote={(_, _card, reaction) =>
          requireSignedIn()
            ? mutateFeedAction({
                actionType: "chika_vote",
                item,
                reaction,
              })
            : undefined
        }
        onMediaLike={(_, card) =>
          requireSignedIn()
            ? mutateFeedAction({
                actionType: "media_like",
                item,
                liked: Boolean(card.media?.viewerHasLiked),
              })
            : undefined
        }
        onNotInterested={() =>
          requireSignedIn()
            ? mutateFeedAction({ actionType: "not_interested", item })
            : undefined
        }
      />
    ),
    [
      canUseFeedActions,
      feedAction.isPending,
      mutateFeedAction,
      requireSignedIn,
    ],
  );

  return (
    <FlatList
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.id}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      onEndReached={() => {
        if (
          feedQuery.hasNextPage &&
          !feedQuery.isFetchingNextPage &&
          !feedQuery.isRefetching
        ) {
          void feedQuery.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.25}
      onRefresh={() => void feedQuery.refetch()}
      removeClippedSubviews={false}
      refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
      renderItem={renderItem}
      style={{ backgroundColor: "#F7FBFD", flex: 1 }}
    />
  );
}
