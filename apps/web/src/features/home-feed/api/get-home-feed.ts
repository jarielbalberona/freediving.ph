import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";
import type { HomeFeedMode, HomeFeedResponse } from "@freediving.ph/types";

const withQuery = (path: string, params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getHomeFeed = (params: {
  mode: HomeFeedMode;
  cursor?: string;
  region?: string;
  limit?: number;
}) =>
  fphgoFetchClient<HomeFeedResponse>(
    withQuery(routes.v1.feed.home(), {
      mode: params.mode,
      cursor: params.cursor,
      region: params.region,
      limit: params.limit,
    }),
  );
