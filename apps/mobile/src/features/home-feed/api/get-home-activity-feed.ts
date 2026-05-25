import type {
  ActivityFeedFilter,
  ActivityFeedResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

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

export const getHomeActivityFeed = (params: {
  filter?: ActivityFeedFilter;
  limit?: number;
}) =>
  fphgoFetch<ActivityFeedResponse>(
    withQuery("/v1/feed/activity", {
      filter: params.filter,
      limit: params.limit,
    }),
    { auth: "optional" },
  );
