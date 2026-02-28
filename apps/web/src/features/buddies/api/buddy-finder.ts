import type {
  BuddyFinderIntentResponse,
  BuddyFinderListResponse,
  BuddyFinderMessageEntryResponse,
  BuddyFinderPreviewResponse,
  BuddyFinderSharePreviewResponse,
  CreateBuddyFinderIntentRequest,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

const withQuery = (path: string, params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const buddyFinderApi = {
  preview: (area?: string) =>
    fphgoFetchClient<BuddyFinderPreviewResponse>(
      withQuery(routes.v1.buddyFinder.preview(), { area }),
    ),

  listIntents: (params: {
    area?: string;
    intentType?: string;
    timeWindow?: string;
    cursor?: string;
    limit?: number;
  }) =>
    fphgoFetchClient<BuddyFinderListResponse>(
      withQuery(routes.v1.buddyFinder.intents(), params),
    ),

  createIntent: (payload: CreateBuddyFinderIntentRequest) =>
    fphgoFetchClient<BuddyFinderIntentResponse>(routes.v1.buddyFinder.intents(), {
      method: "POST",
      body: payload as Record<string, unknown>,
    }),

  deleteIntent: (id: string) =>
    fphgoFetchClient<void>(routes.v1.buddyFinder.byId(id), {
      method: "DELETE",
    }),

  messageEntry: (id: string) =>
    fphgoFetchClient<BuddyFinderMessageEntryResponse>(routes.v1.buddyFinder.message(id), {
      method: "POST",
    }),

  getSharePreview: (id: string) =>
    fphgoFetchClient<BuddyFinderSharePreviewResponse>(routes.v1.buddyFinder.sharePreview(id)),
};
