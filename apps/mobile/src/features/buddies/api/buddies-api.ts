import type {
  BuddyFinderListResponse,
  BuddyFinderIntentResponse,
  BuddyFinderMessageEntryResponse,
  BuddyFinderPreviewResponse,
  BuddyListResponse,
  BuddyPreviewResponse,
  BuddyRequest,
  CreateBuddyFinderIntentRequest,
  IncomingBuddyRequestsResponse,
  OutgoingBuddyRequestsResponse,
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

type BuddyRequestResponse = {
  request: BuddyRequest;
};

export const getBuddyList = (authToken: string) =>
  fphgoFetch<BuddyListResponse>("/v1/buddies", {
    auth: "required",
    authToken,
  });

export const getIncomingBuddyRequests = (authToken: string) =>
  fphgoFetch<IncomingBuddyRequestsResponse>("/v1/buddies/requests/incoming", {
    auth: "required",
    authToken,
  });

export const getOutgoingBuddyRequests = (authToken: string) =>
  fphgoFetch<OutgoingBuddyRequestsResponse>("/v1/buddies/requests/outgoing", {
    auth: "required",
    authToken,
  });

export const sendBuddyRequest = (targetUserId: string, authToken: string) =>
  fphgoFetch<BuddyRequestResponse>("/v1/buddies/requests", {
    auth: "required",
    authToken,
    body: { targetUserId },
    method: "POST",
  });

export const acceptBuddyRequest = (requestId: string, authToken: string) =>
  fphgoFetch<BuddyRequestResponse>(
    `/v1/buddies/requests/${encodeURIComponent(requestId)}/accept`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const declineBuddyRequest = (requestId: string, authToken: string) =>
  fphgoFetch<BuddyRequestResponse>(
    `/v1/buddies/requests/${encodeURIComponent(requestId)}/decline`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const cancelBuddyRequest = (requestId: string, authToken: string) =>
  fphgoFetch<BuddyRequestResponse>(
    `/v1/buddies/requests/${encodeURIComponent(requestId)}`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

export const removeBuddy = (buddyUserId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/buddies/${encodeURIComponent(buddyUserId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const getBuddyPreview = (userId: string, authToken: string) =>
  fphgoFetch<BuddyPreviewResponse>(
    `/v1/buddies/preview/${encodeURIComponent(userId)}`,
    {
      auth: "required",
      authToken,
    },
  );
