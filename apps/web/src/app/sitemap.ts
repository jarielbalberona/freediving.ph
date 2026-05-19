import type { MetadataRoute } from "next";

import type { ExploreListResponse } from "@freediving.ph/types";
import { siteConfig } from "@/config/site";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

const stablePublicRoutes = ["/", "/explore", "/buddies", "/chika", "/events", "/groups"];

const toAbsoluteUrl = (path: string): string => `${siteConfig.url}${path}`;

const fetchPublicDiveSiteEntries = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/explore/sites?limit=100`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ExploreListResponse;
    return payload.items
      .filter((site) => site.slug.trim().length > 0)
      .map((site) => ({
        url: toAbsoluteUrl(`/explore/sites/${encodeURIComponent(site.slug)}`),
        lastModified: site.lastUpdatedAt
          ? new Date(site.lastUpdatedAt)
          : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const stableEntries = stablePublicRoutes.map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : 0.8,
  }));

  return [...stableEntries, ...(await fetchPublicDiveSiteEntries())];
}
