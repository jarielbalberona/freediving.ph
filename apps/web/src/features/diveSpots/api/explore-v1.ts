import type {
  CreateExploreSiteSubmissionRequest,
  CreateExploreSiteUpdateRequest,
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  DivePresenceListResponse,
  DivePresenceResponse,
  DiveSiteAffinityListResponse,
  DiveSiteAffinityResponse,
  ExploreLatestUpdatesResponse,
  ExploreListResponse,
  ExploreSiteSubmissionListResponse,
  ExploreSiteSubmissionResponse,
  ExploreSiteBuddyIntentsResponse,
  ExploreSiteCommunityPostsResponse,
  ExploreSiteBuddyPreviewResponse,
  ExploreSiteDetailResponse,
  ExploreSiteRelatedResponse,
  ModerateExploreSiteRequest,
  LikeState,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export type ExploreFilters = {
  area?: string;
  difficulty?: "easy" | "moderate" | "hard";
  verifiedOnly?: boolean;
  savedOnly?: boolean;
  search?: string;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  cursor?: string;
  limit?: number;
};

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

export const exploreApi = {
  listSites: (filters: ExploreFilters = {}) =>
    fphgoFetchClient<ExploreListResponse>(
      withQuery(routes.v1.explore.listSites(), {
        area: filters.area,
        difficulty: filters.difficulty,
        verifiedOnly: filters.verifiedOnly,
        savedOnly: filters.savedOnly,
        search: filters.search,
        north: filters.north,
        south: filters.south,
        east: filters.east,
        west: filters.west,
        cursor: filters.cursor,
        limit: filters.limit,
      }),
    ),

  listLatestUpdates: (
    params: { area?: string; cursor?: string; limit?: number } = {},
  ) =>
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

  getSiteRelated: (slug: string) =>
    fphgoFetchClient<ExploreSiteRelatedResponse>(
      routes.v1.explore.siteRelated(slug),
    ),

  getSiteCommunityPosts: (slug: string, cursor?: string, limit = 20) =>
    fphgoFetchClient<ExploreSiteCommunityPostsResponse>(
      withQuery(routes.v1.explore.siteCommunityPosts(slug), { cursor, limit }),
    ),

  getSitePresence: (slug: string, limit = 20) =>
    fphgoFetchClient<DivePresenceListResponse>(
      withQuery(routes.v1.explore.sitePresence(slug), { limit }),
    ),

  createSitePresence: (slug: string, payload: CreateDivePresenceRequest) =>
    fphgoFetchClient<DivePresenceResponse>(routes.v1.explore.sitePresence(slug), {
      method: "POST",
      body: payload as Record<string, unknown>,
    }),

  updateSitePresence: (
    slug: string,
    presenceId: string,
    payload: CreateDivePresenceRequest,
  ) =>
    fphgoFetchClient<DivePresenceResponse>(
      routes.v1.explore.sitePresenceById(slug, presenceId),
      {
        method: "PATCH",
        body: payload as Record<string, unknown>,
      },
    ),

  cancelSitePresence: (slug: string, presenceId: string) =>
    fphgoFetchClient<void>(
      routes.v1.explore.sitePresenceById(slug, presenceId),
      { method: "DELETE" },
    ),

  getSiteAffinities: (slug: string, limit = 20) =>
    fphgoFetchClient<DiveSiteAffinityListResponse>(
      withQuery(routes.v1.explore.siteAffinities(slug), { limit }),
    ),

  createSiteAffinity: (slug: string, payload: CreateDiveSiteAffinityRequest) =>
    fphgoFetchClient<DiveSiteAffinityResponse>(
      routes.v1.explore.siteAffinities(slug),
      {
        method: "POST",
        body: payload as Record<string, unknown>,
      },
    ),

  updateSiteAffinity: (
    slug: string,
    affinityId: string,
    payload: CreateDiveSiteAffinityRequest,
  ) =>
    fphgoFetchClient<DiveSiteAffinityResponse>(
      routes.v1.explore.siteAffinityById(slug, affinityId),
      {
        method: "PATCH",
        body: payload as Record<string, unknown>,
      },
    ),

  deleteSiteAffinity: (slug: string, affinityId: string) =>
    fphgoFetchClient<void>(
      routes.v1.explore.siteAffinityById(slug, affinityId),
      { method: "DELETE" },
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

  likeDiveSite: (siteId: string) =>
    fphgoFetchClient<LikeState>(routes.v1.explore.siteLikes(siteId), {
      method: "POST",
    }),

  unlikeDiveSite: (siteId: string) =>
    fphgoFetchClient<LikeState>(routes.v1.explore.siteLikes(siteId), {
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

  submitSite: (payload: CreateExploreSiteSubmissionRequest) =>
    fphgoFetchClient<ExploreSiteSubmissionResponse>(
      routes.v1.explore.submitSite(),
      {
        method: "POST",
        body: payload as Record<string, unknown>,
      },
    ),

  listMySubmissions: (cursor?: string, limit = 20) =>
    fphgoFetchClient<ExploreSiteSubmissionListResponse>(
      withQuery(routes.v1.explore.mySubmissions(), { cursor, limit }),
    ),

  getMySubmissionById: (id: string) =>
    fphgoFetchClient<ExploreSiteSubmissionResponse>(
      routes.v1.explore.mySubmissionById(id),
    ),

  listPendingSites: (cursor?: string, limit = 20) =>
    fphgoFetchClient<ExploreSiteSubmissionListResponse>(
      withQuery(routes.v1.explore.moderationPendingSites(), { cursor, limit }),
    ),

  getModerationSiteById: (id: string) =>
    fphgoFetchClient<ExploreSiteSubmissionResponse>(
      routes.v1.explore.moderationSiteById(id),
    ),

  approveSite: (id: string, payload: ModerateExploreSiteRequest) =>
    fphgoFetchClient<ExploreSiteSubmissionResponse>(
      routes.v1.explore.approveSite(id),
      {
        method: "POST",
        body: payload as Record<string, unknown>,
      },
    ),

  rejectSite: (id: string, payload: ModerateExploreSiteRequest) =>
    fphgoFetchClient<ExploreSiteSubmissionResponse>(
      routes.v1.explore.rejectSite(id),
      {
        method: "POST",
        body: payload as Record<string, unknown>,
      },
    ),
};
