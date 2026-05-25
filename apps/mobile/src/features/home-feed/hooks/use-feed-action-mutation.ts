import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ActivityFeedItem,
  ActivityFeedResponse,
  ChikaReactionType,
  MediaPostLikeState,
} from "@freediving.ph/types";

import {
  likeMediaPost,
  postFeedActions,
  unlikeMediaPost,
} from "@/features/home-feed/api/get-home-activity-feed";
import {
  removeChikaThreadReaction,
  setChikaThreadReaction,
} from "@/features/chika/api/chika-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

export type HomeFeedActionPayload =
  | {
      actionType: "chika_vote";
      item: ActivityFeedItem;
      reaction: ChikaReactionType | null;
    }
  | {
      actionType: "media_like";
      item: ActivityFeedItem;
      liked: boolean;
    }
  | {
      actionType: "not_interested";
      item: ActivityFeedItem;
    };

const feedActionForItem = (item: ActivityFeedItem) => ({
  entityId: item.id,
  entityType: "activity_item",
  feedItemId: item.id,
});

const patchStats = (
  item: ActivityFeedItem,
  patch: Record<string, unknown>,
): ActivityFeedItem => ({
  ...item,
  stats: {
    ...(item.stats ?? {}),
    ...patch,
  },
});

const nextVoteCount = (
  currentVote: ChikaReactionType | undefined,
  nextVote: ChikaReactionType | null,
  voteCount: number,
) => {
  const currentDelta =
    currentVote === "upvote" ? 1 : currentVote === "downvote" ? -1 : 0;
  const nextDelta =
    nextVote === "upvote" ? 1 : nextVote === "downvote" ? -1 : 0;
  return voteCount - currentDelta + nextDelta;
};

const patchActivityFeedItem = (
  response: ActivityFeedResponse | undefined,
  itemId: string,
  patch: (item: ActivityFeedItem) => ActivityFeedItem,
) =>
  response
    ? {
        ...response,
        items: response.items.map((item) =>
          item.id === itemId ? patch(item) : item,
        ),
      }
    : response;

const removeActivityFeedItem = (
  response: ActivityFeedResponse | undefined,
  itemId: string,
) =>
  response
    ? {
        ...response,
        items: response.items.filter((item) => item.id !== itemId),
      }
    : response;

export const useFeedActionMutation = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: HomeFeedActionPayload) => {
      const token = await getToken();
      if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);

      if (payload.actionType === "chika_vote") {
        if (payload.reaction) {
          return setChikaThreadReaction(payload.item.sourceId, payload.reaction, token);
        }
        return removeChikaThreadReaction(payload.item.sourceId, token);
      }

      if (payload.actionType === "media_like") {
        return payload.liked
          ? unlikeMediaPost(payload.item.sourceId, token)
          : likeMediaPost(payload.item.sourceId, token);
      }

      return postFeedActions(
        {
          items: [
            {
              ...feedActionForItem(payload.item),
              actionType: "not_interested",
              createdAt: new Date().toISOString(),
            },
          ],
          mode: "latest",
          sessionId: "mobile",
          source: "activity",
        },
        token,
      );
    },
    onSuccess: (response, payload) => {
      if (payload.actionType === "media_like") {
        const likeState = response as MediaPostLikeState;
        queryClient.setQueriesData<ActivityFeedResponse>(
          { queryKey: mobileQueryKeys.feed.all },
          (current) =>
            patchActivityFeedItem(current, payload.item.id, (item) =>
              patchStats(item, {
                likeCount: likeState.likeCount,
                viewerHasLiked: likeState.viewerHasLiked,
              }),
            ),
        );
        return;
      }

      if (payload.actionType === "chika_vote") {
        queryClient.setQueriesData<ActivityFeedResponse>(
          { queryKey: mobileQueryKeys.feed.all },
          (current) =>
            patchActivityFeedItem(current, payload.item.id, (item) => {
              const currentVote =
                item.stats?.userReaction === "upvote" ||
                item.stats?.userReaction === "downvote"
                  ? item.stats.userReaction
                  : undefined;
              const voteCount =
                typeof item.stats?.voteCount === "number"
                  ? item.stats.voteCount
                  : 0;
              const nextCount = nextVoteCount(
                currentVote,
                payload.reaction,
                voteCount,
              );
              return patchStats(item, {
                reactionCount: nextCount,
                reactions: nextCount,
                userReaction: payload.reaction,
                viewerReaction: payload.reaction,
                voteCount: nextCount,
              });
            }),
        );
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.chika.threads() });
        return;
      }

      queryClient.setQueriesData<ActivityFeedResponse>(
        { queryKey: mobileQueryKeys.feed.all },
        (current) => removeActivityFeedItem(current, payload.item.id),
      );
    },
  });
};
