"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postFeedActions } from "@/features/home-feed/api/post-feed-actions";
import { queryKeys } from "@/lib/query/query-keys";
import type { FeedActionsRequest } from "@freediving.ph/types";

const shouldRemoveVisibleItem = (payload: FeedActionsRequest) =>
  payload.items.some((action) =>
    ["hide", "not_interested"].includes(action.actionType),
  );

const actionItemIds = (payload: FeedActionsRequest) =>
  new Set(
    payload.items
      .filter((action) => ["hide", "not_interested"].includes(action.actionType))
      .map((action) => action.feedItemId ?? action.entityId),
  );

const removeFeedItems = (current: unknown, itemIds: Set<string>) => {
  const data = current as { items?: Array<{ id?: string; feedItemId?: string }> } | undefined;
  if (!data?.items) return current;
  return {
    ...data,
    items: data.items.filter((item) => {
      const id = item.feedItemId ?? item.id;
      return !id || !itemIds.has(id);
    }),
  };
};

export const useFeedActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FeedActionsRequest) => postFeedActions(payload),
    onMutate: async (payload) => {
      if (!shouldRemoveVisibleItem(payload)) return {};
      const itemIds = actionItemIds(payload);
      const previousHome = queryClient.getQueriesData({
        queryKey: queryKeys.feed.all,
      });
      const previousActivity = queryClient.getQueriesData({
        queryKey: queryKeys.feed.activityAll,
      });

      queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current) =>
        removeFeedItems(current, itemIds),
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.feed.activityAll },
        (current) => removeFeedItems(current, itemIds),
      );

      return { previousActivity, previousHome };
    },
    onError: (_error, _payload, context) => {
      for (const [queryKey, data] of context?.previousHome ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
      for (const [queryKey, data] of context?.previousActivity ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
};
