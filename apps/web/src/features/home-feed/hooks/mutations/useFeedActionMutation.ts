"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postFeedActions } from "@/features/home-feed/api/post-feed-actions";
import {
  feedActionRemovalIds,
  removeFeedItemsFromCaches,
  restoreQuerySnapshots,
  shouldRemoveVisibleFeedItems,
} from "@/features/home-feed/lib/cache-updaters";
import type { FeedActionsRequest } from "@freediving.ph/types";

export const useFeedActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FeedActionsRequest) => postFeedActions(payload),
    onMutate: async (payload) => {
      if (!shouldRemoveVisibleFeedItems(payload)) {
        return { previousActivity: [], previousHome: [] };
      }
      return removeFeedItemsFromCaches(
        queryClient,
        feedActionRemovalIds(payload),
      );
    },
    onError: (_error, _payload, context) => {
      restoreQuerySnapshots(queryClient, context?.previousHome);
      restoreQuerySnapshots(queryClient, context?.previousActivity);
    },
  });
};
