import type { MetadataRoute } from "next";

import type {
  ChikaThreadListResponse,
  Event,
  ExploreListResponse,
  Group,
  PublicSchool,
} from "@freediving.ph/types";
import { siteConfig } from "@/config/site";
import { stablePublicRoutes } from "@/features/public-content/seo/routes";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

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

type GroupListPayload = {
  groups: Group[];
};

type EventListPayload = {
  events: Event[];
};

const fetchPublicGroupEntries = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/groups?limit=100`,
      {
        cache: "no-store",
        headers: { accept: "application/json" },
      },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as GroupListPayload;
    return payload.groups
      .filter((group) => group.slug.trim().length > 0)
      .map((group) => ({
        url: toAbsoluteUrl(`/groups/${encodeURIComponent(group.slug)}`),
        lastModified: group.updatedAt ? new Date(group.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
};

const fetchPublicEventEntries = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/events?status=published&limit=100`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as EventListPayload;
    return payload.events
      .filter(
        (event) =>
          event.slug.trim().length > 0 &&
          event.status === "published" &&
          event.visibility === "public",
      )
      .map((event) => ({
        url: toAbsoluteUrl(`/events/${encodeURIComponent(event.slug)}`),
        lastModified: event.updatedAt ? new Date(event.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
};

const fetchPublicChikaEntries = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/chika/threads?limit=100`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as ChikaThreadListResponse;
    return (payload.items ?? [])
      .filter(
        (thread) =>
          thread.slug.trim().length > 0 &&
          !thread.isHidden &&
          !thread.categoryPseudonymous,
      )
      .map((thread) => ({
        url: toAbsoluteUrl(`/chika/${encodeURIComponent(thread.slug)}`),
        lastModified: thread.updatedAt ? new Date(thread.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
};

type SchoolListPayload = {
  schools: PublicSchool[];
};

const fetchPublicSchoolEntries = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    const response = await fetch(`${getFphgoBaseUrlServer()}/v1/schools?limit=100`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as SchoolListPayload;
    return payload.schools
      .filter((school) => school.slug.trim().length > 0)
      .map((school) => ({
        url: toAbsoluteUrl(`/schools/${encodeURIComponent(school.slug)}`),
        lastModified: undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
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

  const [diveSites, groups, events, chika, schools] = await Promise.all([
    fetchPublicDiveSiteEntries(),
    fetchPublicGroupEntries(),
    fetchPublicEventEntries(),
    fetchPublicChikaEntries(),
    fetchPublicSchoolEntries(),
  ]);

  return [
    ...stableEntries,
    ...diveSites,
    ...groups,
    ...events,
    ...chika,
    ...schools,
  ];
}
