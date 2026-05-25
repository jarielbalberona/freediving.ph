import type {
  ExploreListResponse,
  ExploreSiteDetailResponse,
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

export const getExploreSites = (params: { limit?: number } = {}) =>
  fphgoFetch<ExploreListResponse>(
    withQuery("/v1/explore/sites", {
      limit: params.limit,
    }),
    { auth: "none" },
  );

export const getExploreSiteDetail = (slug: string) =>
  fphgoFetch<ExploreSiteDetailResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}`, {
      updatesLimit: 5,
    }),
    { auth: "none" },
  );
