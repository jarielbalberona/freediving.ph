import { useAuth } from "@clerk/expo";
import { useMutation } from "@tanstack/react-query";

import type { ActivityFeedItem } from "@freediving.ph/types";

import { postFeedActions } from "@/features/home-feed/api/get-home-activity-feed";
import { FphgoApiError } from "@/lib/api";

const feedActionForItem = (item: ActivityFeedItem) => ({
  entityId: item.sourceId,
  entityType: item.sourceType || item.type,
  feedItemId: item.id,
});

export const useFeedActionMutation = () => {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      actionType: "open" | "like" | "upvote" | "interested";
      item: ActivityFeedItem;
    }) => {
      const token = await getToken();
      if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
      return postFeedActions(
        {
          items: [
            {
              ...feedActionForItem(payload.item),
              actionType: payload.actionType,
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
  });
};
