import { apiClient } from "@/lib/api/client";

import { MOCK_EXPLORE_SPOTS } from "../mock-data";
import type {
  DiveSpot,
  ExploreBounds,
  ExploreResponse,
  ExploreSearchParams,
} from "../types";

const USE_MOCK_EXPLORE_API =
  process.env.NEXT_PUBLIC_EXPLORE_USE_MOCK !== "false";

const normalize = (value: string) => value.trim().toLowerCase();

const isWithinBounds = (spot: DiveSpot, bounds: ExploreBounds | null) => {
  if (!bounds) return true;
  return (
    spot.lat <= bounds.ne.lat &&
    spot.lat >= bounds.sw.lat &&
    spot.lng <= bounds.ne.lng &&
    spot.lng >= bounds.sw.lng
  );
};

const buildQueryString = (params: ExploreSearchParams) => {
  const searchParams = new URLSearchParams();
  if (params.q.trim()) searchParams.set("q", params.q.trim());
  if (typeof params.minRating === "number")
    searchParams.set("minRating", String(params.minRating));
  if (params.tags.length > 0) searchParams.set("tags", params.tags.join(","));
  if (params.bounds) {
    searchParams.set(
      "bounds",
      [
        params.bounds.ne.lat.toFixed(5),
        params.bounds.ne.lng.toFixed(5),
        params.bounds.sw.lat.toFixed(5),
        params.bounds.sw.lng.toFixed(5),
      ].join(","),
    );
  }
  searchParams.set("limit", String(params.limit));
  searchParams.set("offset", String(params.offset));
  return searchParams.toString();
};

const searchMockDiveSpots = async (
  params: ExploreSearchParams,
): Promise<ExploreResponse> => {
  const keyword = normalize(params.q);

  const filtered = MOCK_EXPLORE_SPOTS.filter((spot) => {
    const matchesKeyword =
      keyword.length === 0 ||
      normalize(spot.name).includes(keyword) ||
      normalize(spot.area).includes(keyword) ||
      (spot.tags ?? []).some((tag) => normalize(tag).includes(keyword));

    const matchesRating =
      typeof params.minRating !== "number" ||
      (spot.rating ?? 0) >= params.minRating;

    const matchesTags =
      params.tags.length === 0 ||
      params.tags.every((selectedTag) =>
        (spot.tags ?? []).includes(selectedTag),
      );

    return (
      matchesKeyword &&
      matchesRating &&
      matchesTags &&
      isWithinBounds(spot, params.bounds)
    );
  });

  const page = filtered.slice(params.offset, params.offset + params.limit);
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { items: page, total: filtered.length };
};

export const exploreApi = {
  async searchDiveSpots(params: ExploreSearchParams): Promise<ExploreResponse> {
    if (USE_MOCK_EXPLORE_API) {
      return searchMockDiveSpots(params);
    }

    const queryString = buildQueryString(params);
    return apiClient<ExploreResponse>(`/explore/dive-spots?${queryString}`);
  },
};
