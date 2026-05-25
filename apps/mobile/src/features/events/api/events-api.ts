import type {
  EventDetailResponse,
  EventFilters,
  EventListResponse,
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
    { auth: "none" },
  );

export const getEventDetail = (slug: string) =>
  fphgoFetch<EventDetailResponse>(
    `/v1/events/${encodeURIComponent(slug)}`,
    { auth: "none" },
  );
