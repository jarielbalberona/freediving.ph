import type {
  CreateExploreSiteUpdateRequest,
  ExploreLatestUpdatesResponse,
  ExploreListResponse,
  ExploreSiteBuddyIntentsResponse,
  ExploreSiteBuddyPreviewResponse,
  ExploreSiteDetailResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export type ExploreFilters = {
  area?: string;
  difficulty?: "easy" | "moderate" | "hard";
  verifiedOnly?: boolean;
  search?: string;
  cursor?: string;
  limit?: number;
};

const withQuery = (path: string, params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const exploreApi = {
  listSites: (filters: ExploreFilters = {}) =>
    fphgoFetchClient<ExploreListResponse>(
      withQuery(routes.v1.explore.listSites(), {
        area: filters.area,
        difficulty: filters.difficulty,
        verifiedOnly: filters.verifiedOnly,
        search: filters.search,
        cursor: filters.cursor,
        limit: filters.limit,
      }),
    ),

  listLatestUpdates: (params: { area?: string; cursor?: string; limit?: number } = {}) =>
    fphgoFetchClient<ExploreLatestUpdatesResponse>(
      withQuery(routes.v1.explore.latestUpdates(), params),
    ),

  getSiteBySlug: (slug: string, updatesCursor?: string, updatesLimit = 10) =>
    fphgoFetchClient<ExploreSiteDetailResponse>(
      withQuery(routes.v1.explore.siteBySlug(slug), {
        updatesCursor,
        updatesLimit,
      }),
    ),
  getSiteBuddyPreview: (slug: string, limit = 6) =>
    fphgoFetchClient<ExploreSiteBuddyPreviewResponse>(
      withQuery(routes.v1.explore.siteBuddyPreview(slug), { limit }),
    ),

  getSiteBuddyIntents: (slug: string, cursor?: string, limit = 10) =>
    fphgoFetchClient<ExploreSiteBuddyIntentsResponse>(
      withQuery(routes.v1.explore.siteBuddyIntents(slug), { cursor, limit }),
    ),
  saveSite: (siteId: string) =>
    fphgoFetchClient<{ saved: boolean }>(routes.v1.explore.saveSite(siteId), {
      method: "POST",
    }),

  unsaveSite: (siteId: string) =>
    fphgoFetchClient<void>(routes.v1.explore.saveSite(siteId), {
      method: "DELETE",
    }),

  createUpdate: (siteId: string, payload: CreateExploreSiteUpdateRequest) =>
    fphgoFetchClient<{ update: ExploreSiteDetailResponse["updates"][number] }>(
      routes.v1.explore.createUpdate(siteId),
      {
        method: "POST",
        body: payload as Record<string, unknown>,
      },
    ),
};
