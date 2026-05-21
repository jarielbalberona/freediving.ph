import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { FeedActionsRequest } from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

type VisibleFeedItem = {
  id?: string;
  feedItemId?: string;
};

type FeedItemsCache<TItem extends VisibleFeedItem = VisibleFeedItem> = {
  items?: TItem[];
};

export type QuerySnapshot = [QueryKey, unknown];

const removalActionTypes = new Set(["hide", "not_interested"]);

export const shouldRemoveVisibleFeedItems = (payload: FeedActionsRequest) =>
  payload.items.some((action) => removalActionTypes.has(action.actionType));

export const feedActionRemovalIds = (payload: FeedActionsRequest) =>
  new Set(
    payload.items
      .filter((action) => removalActionTypes.has(action.actionType))
      .map((action) => action.feedItemId ?? action.entityId),
  );

export const removeFeedItemsFromCache = <
  TCache extends FeedItemsCache<TItem>,
  TItem extends VisibleFeedItem = VisibleFeedItem,
>(
  current: TCache | undefined,
  itemIds: Set<string>,
) => {
  if (!current?.items) return current;
  return {
    ...current,
    items: current.items.filter((item) => {
      const id = item.feedItemId ?? item.id;
      return !id || !itemIds.has(id);
    }),
  };
};

export function removeFeedItemsFromCaches(
  queryClient: QueryClient,
  itemIds: Set<string>,
) {
  const previousHome = queryClient.getQueriesData({
    queryKey: queryKeys.feed.all,
  });
  const previousActivity = queryClient.getQueriesData({
    queryKey: queryKeys.feed.activityAll,
  });

  queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current) =>
    removeFeedItemsFromCache(current as FeedItemsCache | undefined, itemIds),
  );
  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current) =>
      removeFeedItemsFromCache(current as FeedItemsCache | undefined, itemIds),
  );

  return { previousActivity, previousHome };
}

export function restoreQuerySnapshots(
  queryClient: QueryClient,
  snapshots: QuerySnapshot[] | undefined,
) {
  for (const [queryKey, data] of snapshots ?? []) {
    queryClient.setQueryData(queryKey, data);
  }
}
