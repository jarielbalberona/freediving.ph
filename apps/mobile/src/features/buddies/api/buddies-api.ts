import type { BuddyFinderListResponse } from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getBuddyFinderIntents = (
  filters: { limit?: number },
  authToken: string,
) =>
  fphgoFetch<BuddyFinderListResponse>(
    withQuery("/v1/buddy-finder/intents", {
      limit: filters.limit,
    }),
    {
      auth: "required",
      authToken,
    },
  );
