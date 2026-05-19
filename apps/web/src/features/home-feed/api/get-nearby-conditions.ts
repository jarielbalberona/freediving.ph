import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";
import type { NearbyConditionsResponse } from "@freediving.ph/types";

const withQuery = (
  path: string,
  params: Record<string, number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && Number.isFinite(value)) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getNearbyConditions = (params: {
  lat?: number;
  lng?: number;
}) =>
  fphgoFetchClient<NearbyConditionsResponse>(
    withQuery(routes.v1.home.nearbyConditions(), {
      lat: params.lat,
      lng: params.lng,
    }),
    { cache: "no-store" },
  );
