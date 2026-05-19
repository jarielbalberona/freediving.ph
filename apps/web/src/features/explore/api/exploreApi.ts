import type { ExploreSiteCard } from "@freediving.ph/types";

import { exploreApi as exploreV1Api } from "@/features/diveSpots/api/explore-v1";

import type { DiveSpot, ExploreResponse, ExploreSearchParams } from "../types";

const mapSiteCard = (site: ExploreSiteCard): DiveSpot => ({
  id: site.id,
  slug: site.slug,
  name: site.name,
  area: site.area,
  lat: site.latitude,
  lng: site.longitude,
  difficulty: site.difficulty,
  depthMinM: site.depthMinM,
  depthMaxM: site.depthMaxM,
  hazards: site.hazards,
  verificationStatus: site.verificationStatus,
  recentUpdateCount: site.recentUpdateCount,
  lastConditionSummary: site.lastConditionSummary,
  isSaved: site.isSaved,
  likeCount: site.likeCount,
  viewerHasLiked: site.viewerHasLiked,
  buddySignal: site.buddySignal,
});

export const exploreApi = {
  async searchDiveSpots(params: ExploreSearchParams): Promise<ExploreResponse> {
    const bounds = params.bounds;
    const response = await exploreV1Api.listSites({
      search: params.q.trim() || undefined,
      area: params.area,
      difficulty: params.difficulty,
      verifiedOnly: params.verifiedOnly,
      savedOnly: params.savedOnly,
      north: bounds?.ne.lat,
      south: bounds?.sw.lat,
      east: bounds?.ne.lng,
      west: bounds?.sw.lng,
      cursor: params.cursor,
      limit: params.limit,
    });

    return {
      items: response.items.map(mapSiteCard),
      nextCursor: response.nextCursor,
    };
  },
};
