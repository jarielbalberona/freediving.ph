import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";
import type { FeedActionsRequest } from "@freediving.ph/types";

export const postFeedActions = (payload: FeedActionsRequest) =>
  fphgoFetchClient<void>(routes.v1.feed.actions(), {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
