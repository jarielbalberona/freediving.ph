import type { Metadata } from "next";

import type { Group } from "@freediving.ph/types";

import { siteConfig } from "@/config/site";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import GroupDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type GroupPayload = {
  group: Group;
};

const groupUrl = (slug: string) => `${siteConfig.url}/groups/${encodeURIComponent(slug)}`;

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
  const canonical = groupUrl(slug);
  const group = await getPublicGroupMetadata(slug);
  const title = group ? `${group.name} | Groups` : "Group | Freediving Philippines";
  const description =
    group?.bio || group?.description || "Freediving Philippines group.";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
    },
  };
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <GroupDetailClient slug={slug} />;
}
