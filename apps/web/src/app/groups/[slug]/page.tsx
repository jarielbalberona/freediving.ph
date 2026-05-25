import type { Metadata } from "next";

import type { Group } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import GroupDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type GroupPayload = {
  group: Group;
};

const groupPath = (slug: string) => `/groups/${encodeURIComponent(slug)}` as const;

const headingFromSlug = (slug: string, fallback: string) => {
  const decoded = decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const heading = decoded
    ? decoded.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
  return heading.length > 150 ? `${heading.slice(0, 147).trimEnd()}...` : heading;
};

const isIndexableGroup = (group: Group | null): group is Group =>
  group?.status === "active" && group.visibility === "public";

const groupDescription = (group: Group) =>
  truncateSeoDescription(
    group.bio ||
      group.description ||
      [
        group.locationName || group.formattedAddress || group.location,
        "Join this freediving group and connect with the community.",
      ]
        .filter(Boolean)
        .join(". "),
  );

async function getPublicGroupMetadata(slug: string): Promise<Group | null> {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/groups/${encodeURIComponent(slug)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as GroupPayload;
    return payload.group;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = groupPath(slug);
  const group = await getPublicGroupMetadata(slug);
  if (!isIndexableGroup(group)) {
    return buildNoindexMetadata({
      title: "Group | Freediving Philippines",
      description: "This group is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${group.name} | Freediving Group`,
    description: groupDescription(group),
    path,
  });
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await getPublicGroupMetadata(slug);
  const path = groupPath(slug);
  const h1 = isIndexableGroup(group)
    ? group.name
    : headingFromSlug(slug, "Freediving group");

  return (
    <>
      <h1 className="sr-only">{h1}</h1>
      {isIndexableGroup(group) ? (
        <>
          <StructuredData
            data={[
              webPageJsonLd({
                title: `${group.name} | Freediving Group`,
                description: groupDescription(group),
                path,
              }),
              breadcrumbJsonLd([
                { name: "Groups", path: "/groups" },
                { name: group.name, path },
              ]),
            ]}
          />
        </>
      ) : null}
      <GroupDetailClient slug={slug} />
    </>
  );
}
