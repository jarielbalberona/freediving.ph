import type { Metadata } from "next";

import type { ChikaThreadResponse } from "@freediving.ph/types";

import { siteConfig } from "@/config/site";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import ChikaDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const chikaUrl = (slug: string) => `${siteConfig.url}/chika/${encodeURIComponent(slug)}`;

async function getPublicThreadMetadata(
  slug: string,
): Promise<ChikaThreadResponse | null> {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/chika/threads/${encodeURIComponent(slug)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return null;
    return (await response.json()) as ChikaThreadResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonical = chikaUrl(slug);
  const thread = await getPublicThreadMetadata(slug);
  const title = thread ? `${thread.title} | Chika` : "Chika | Freediving Philippines";
  const description =
    thread?.content || "Freediving Philippines community discussion.";

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

export default async function ChikaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <ChikaDetailClient slug={slug} />;
}
