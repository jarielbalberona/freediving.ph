import type {
  CreateEventPostRequest,
  EventDetailResponse,
  EventFilters,
  EventListResponse,
  EventPostResponse,
  EventPostReactionResponse,
  EventPostsResponse,
  JoinEventResponse,
  JoinEventRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getEvents = (filters: EventFilters = {}) =>
  fphgoFetch<EventListResponse>(
    withQuery("/v1/events", {
      beginnerFriendly: filters.beginnerFriendly,
      difficulty: filters.difficulty,
      diveSiteId: filters.diveSiteId,
      groupId: filters.groupId,
      limit: filters.limit,
      page: filters.page,
      price: filters.price,
      search: filters.search,
      status: filters.status,
      type: filters.type,
    }),
    { auth: "optional" },
  );

export const getEventDetail = (slug: string) =>
  fphgoFetch<EventDetailResponse>(
    `/v1/events/${encodeURIComponent(slug)}`,
    { auth: "optional" },
  );

export const joinEvent = (eventId: string, authToken: string) =>
  fphgoFetch<JoinEventResponse>(`/v1/events/${encodeURIComponent(eventId)}/join`, {
    auth: "required",
    authToken,
    body: { joinAnswers: {} } satisfies JoinEventRequest,
    method: "POST",
  });

export const leaveEvent = (eventId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/events/${encodeURIComponent(eventId)}/leave`, {
    auth: "required",
    authToken,
    method: "POST",
  });

export const setEventInterest = (eventId: string, authToken: string) =>
  fphgoFetch<EventDetailResponse>(`/v1/events/${encodeURIComponent(eventId)}/interest`, {
    auth: "required",
    authToken,
    method: "PUT",
  });

export const removeEventInterest = (eventId: string, authToken: string) =>
  fphgoFetch<EventDetailResponse>(`/v1/events/${encodeURIComponent(eventId)}/interest`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const getEventPosts = (eventId: string) =>
  fphgoFetch<EventPostsResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/posts`,
    { auth: "optional" },
  );

export const createEventPost = (
  eventId: string,
  payload: CreateEventPostRequest,
  authToken: string,
) =>
  fphgoFetch<EventPostResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/posts`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const setEventPostFish = (
  eventId: string,
  postId: string,
  authToken: string,
) =>
  fphgoFetch<EventPostReactionResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/updates/${encodeURIComponent(postId)}/reactions/fish`,
    { auth: "required", authToken, method: "POST" },
  );

export const removeEventPostFish = (
  eventId: string,
  postId: string,
  authToken: string,
) =>
  fphgoFetch<EventPostReactionResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/updates/${encodeURIComponent(postId)}/reactions/fish`,
    { auth: "required", authToken, method: "DELETE" },
  );
