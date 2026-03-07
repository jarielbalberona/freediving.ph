import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";
import type { FeedImpressionsRequest } from "@freediving.ph/types";

export const postFeedImpressions = (payload: FeedImpressionsRequest) =>
  fphgoFetchClient<void>(routes.v1.feed.impressions(), {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
