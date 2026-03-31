import type { ExploreSiteCard } from "@freediving.ph/types";

import { exploreApi as exploreV1Api } from "@/features/diveSpots/api/explore-v1";

import type {
  DiveSpot,
  ExploreBounds,
  ExploreResponse,
  ExploreSearchParams,
} from "../types";

const isWithinBounds = (spot: DiveSpot, bounds: ExploreBounds | null) => {
  if (!bounds) return true;
  if (typeof spot.lat !== "number" || typeof spot.lng !== "number") return false;
  return (
    spot.lat <= bounds.ne.lat &&
    spot.lat >= bounds.sw.lat &&
    spot.lng <= bounds.ne.lng &&
    spot.lng >= bounds.sw.lng
  );
};

const mapSiteCard = (site: ExploreSiteCard): DiveSpot => ({
  id: site.id,
  slug: site.slug,
  name: site.name,
  area: site.area,
  lat: site.latitude,
  lng: site.longitude,
  difficulty: site.difficulty,
  verificationStatus: site.verificationStatus,
  recentUpdateCount: site.recentUpdateCount,
  lastConditionSummary: site.lastConditionSummary,
  isSaved: site.isSaved,
});

export const exploreApi = {
  async searchDiveSpots(params: ExploreSearchParams): Promise<ExploreResponse> {
    const response = await exploreV1Api.listSites({
      search: params.q.trim() || undefined,
      cursor: params.cursor,
      limit: params.limit,
    });

    const items = response.items
      .map(mapSiteCard)
      .filter((spot) => isWithinBounds(spot, params.bounds));

    return {
      items,
      nextCursor: response.nextCursor,
    };
  },
};
