import "server-only";

import type {
  ExploreLatestUpdatesResponse,
  DivePresenceListResponse,
  DiveSiteAffinityListResponse,
  DiveSiteReviewListResponse,
  ExploreSiteCommunityPostsResponse,
  ExploreSiteBuddyPreviewResponse,
  ExploreSiteDetailResponse,
  ExploreSiteRelatedResponse,
} from "@freediving.ph/types";

import { fphgoFetchServer } from "@/lib/api/fphgo-fetch-server";
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

export const getExploreSiteBySlugServer = (slug: string, updatesCursor?: string, updatesLimit = 10) =>
  fphgoFetchServer<ExploreSiteDetailResponse>(
    withQuery(routes.v1.explore.siteBySlug(slug), {
      updatesCursor,
      updatesLimit,
    }),
  );

export const getExploreSiteBuddyPreviewServer = (slug: string, limit = 6) =>
  fphgoFetchServer<ExploreSiteBuddyPreviewResponse>(
    withQuery(routes.v1.explore.siteBuddyPreview(slug), { limit }),
  );

export const getExploreSiteRelatedServer = (slug: string) =>
  fphgoFetchServer<ExploreSiteRelatedResponse>(
    routes.v1.explore.siteRelated(slug),
  );

export const getExploreSiteCommunityPostsServer = (
  slug: string,
  cursor?: string,
  limit = 20,
) =>
  fphgoFetchServer<ExploreSiteCommunityPostsResponse>(
    withQuery(routes.v1.explore.siteCommunityPosts(slug), { cursor, limit }),
  );

export const getExploreSitePresenceServer = (slug: string, limit = 6) =>
  fphgoFetchServer<DivePresenceListResponse>(
    withQuery(routes.v1.explore.sitePresence(slug), { limit }),
  );

export const getExploreSiteAffinitiesServer = (slug: string, limit = 6) =>
  fphgoFetchServer<DiveSiteAffinityListResponse>(
    withQuery(routes.v1.explore.siteAffinities(slug), { limit }),
  );

export const getExploreSiteReviewsServer = (slug: string, limit = 6) =>
  fphgoFetchServer<DiveSiteReviewListResponse>(
    withQuery(routes.v1.explore.siteReviews(slug), { limit }),
  );

export const getExploreLatestUpdatesServer = (area?: string, cursor?: string, limit = 20) =>
  fphgoFetchServer<ExploreLatestUpdatesResponse>(
    withQuery(routes.v1.explore.latestUpdates(), { area, cursor, limit }),
  );
