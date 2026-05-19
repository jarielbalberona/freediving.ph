import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";
import type {
  ActivityFeedFilter,
  ActivityFeedResponse,
  HomeFeedMode,
} from "@freediving.ph/types";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getActivityFeed = (params: {
  filter?: ActivityFeedFilter;
  mode?: HomeFeedMode;
  cursor?: string;
  region?: string;
  limit?: number;
}) =>
  fphgoFetchClient<ActivityFeedResponse>(
    withQuery(routes.v1.feed.activity(), {
      filter: params.filter,
      mode: params.mode,
      cursor: params.cursor,
      region: params.region,
      limit: params.limit,
    }),
    { auth: "ready-only", cache: "no-store" },
  );
