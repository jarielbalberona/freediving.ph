import type {
  BuddyFinderListResponse,
  BuddyFinderIntentResponse,
  BuddyFinderMessageEntryResponse,
  BuddyFinderPreviewResponse,
  CreateBuddyFinderIntentRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getBuddyFinderIntents = (
  filters: { limit?: number },
  authToken: string,
) =>
  fphgoFetch<BuddyFinderListResponse>(
    withQuery("/v1/buddy-finder/intents", {
      limit: filters.limit,
    }),
    {
      auth: "required",
      authToken,
    },
  );

export const getBuddyFinderPreview = (filters: { limit?: number }) =>
  fphgoFetch<BuddyFinderPreviewResponse>(
    withQuery("/v1/buddy-finder/preview", {
      limit: filters.limit,
    }),
    { auth: "none" },
  );

export const getMyBuddyFinderIntents = (authToken: string) =>
  fphgoFetch<BuddyFinderListResponse>("/v1/buddy-finder/intents/mine", {
    auth: "required",
    authToken,
  });

export const createBuddyFinderIntent = (
  payload: CreateBuddyFinderIntentRequest,
  authToken: string,
) =>
  fphgoFetch<BuddyFinderIntentResponse>("/v1/buddy-finder/intents", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const deleteBuddyFinderIntent = (intentId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/buddy-finder/intents/${encodeURIComponent(intentId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const getBuddyFinderMessageEntry = (intentId: string, authToken: string) =>
  fphgoFetch<BuddyFinderMessageEntryResponse>(
    `/v1/buddy-finder/intents/${encodeURIComponent(intentId)}/message`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );
