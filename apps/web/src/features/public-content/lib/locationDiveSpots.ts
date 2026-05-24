import type { ExploreListResponse, ExploreSiteCard } from "@freediving.ph/types";

import type { PublicLocationContent } from "@/features/public-content/content/locations";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

export type PublicLocationDiveSpot = Pick<
  ExploreSiteCard,
  | "slug"
  | "name"
  | "area"
  | "difficulty"
  | "depthMinM"
  | "depthMaxM"
  | "hazards"
  | "verificationStatus"
  | "lastConditionSummary"
>;

export async function fetchLocationDiveSpots(
  location: PublicLocationContent,
): Promise<PublicLocationDiveSpot[]> {
  if (!location.exploreQuery?.search) return [];

  const url = new URL(`${getFphgoBaseUrlServer()}/v1/explore/sites`);
  url.searchParams.set("search", location.exploreQuery.search);
  url.searchParams.set("limit", "6");

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as ExploreListResponse;
    return payload.items
      .filter((site) => site.slug.trim().length > 0)
      .slice(0, 6)
      .map((site) => ({
        slug: site.slug,
        name: site.name,
        area: site.area,
        difficulty: site.difficulty,
        depthMinM: site.depthMinM,
        depthMaxM: site.depthMaxM,
        hazards: site.hazards,
        verificationStatus: site.verificationStatus,
        lastConditionSummary: site.lastConditionSummary,
      }));
  } catch {
    return [];
  }
}

export function exploreHrefForLocation(location: PublicLocationContent): string {
  if (!location.exploreQuery?.search) return "/explore";
  const search = new URLSearchParams({ q: location.exploreQuery.search });
  return `/explore?${search.toString()}`;
}
