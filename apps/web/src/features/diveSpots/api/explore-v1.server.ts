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
  ListProfileMediaResponse,
} from "@freediving.ph/types";

import {
  fphgoFetchPublicServer,
  fphgoFetchServer,
} from "@/lib/api/fphgo-fetch-server";
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
  fphgoFetchPublicServer<ExploreSiteDetailResponse>(
    withQuery(routes.v1.explore.siteBySlug(slug), {
      updatesCursor,
      updatesLimit,
    }),
  );

export const getExploreSiteBuddyPreviewServer = (slug: string, limit = 6) =>
  fphgoFetchPublicServer<ExploreSiteBuddyPreviewResponse>(
    withQuery(routes.v1.explore.siteBuddyPreview(slug), { limit }),
  );

export const getExploreSiteRelatedServer = (slug: string) =>
  fphgoFetchPublicServer<ExploreSiteRelatedResponse>(
    routes.v1.explore.siteRelated(slug),
  );

export const getExploreSiteCommunityPostsServer = (
  slug: string,
  cursor?: string,
  limit = 20,
) =>
  fphgoFetchPublicServer<ExploreSiteCommunityPostsResponse>(
    withQuery(routes.v1.explore.siteCommunityPosts(slug), { cursor, limit }),
  );

export const getExploreSitePresenceServer = (slug: string, limit = 6) =>
  fphgoFetchPublicServer<DivePresenceListResponse>(
    withQuery(routes.v1.explore.sitePresence(slug), { limit }),
  );

export const getExploreSiteAffinitiesServer = (slug: string, limit = 6) =>
  fphgoFetchPublicServer<DiveSiteAffinityListResponse>(
    withQuery(routes.v1.explore.siteAffinities(slug), { limit }),
  );

export const getExploreSiteReviewsServer = (slug: string, limit = 6) =>
  fphgoFetchPublicServer<DiveSiteReviewListResponse>(
    withQuery(routes.v1.explore.siteReviews(slug), { limit }),
  );

export const getDiveSiteMomentsServer = (siteId: string, limit = 12) =>
  fphgoFetchPublicServer<ListProfileMediaResponse>(
    withQuery(routes.v1.media.momentsByDiveSite(siteId), { limit }),
  );

export const getExploreLatestUpdatesServer = (area?: string, cursor?: string, limit = 20) =>
  fphgoFetchServer<ExploreLatestUpdatesResponse>(
    withQuery(routes.v1.explore.latestUpdates(), { area, cursor, limit }),
  );
