import type { Metadata } from "next";

import type { ChikaThreadResponse } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  discussionForumPostingJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import ChikaDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const chikaPath = (slug: string) => `/chika/${encodeURIComponent(slug)}` as const;

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

const isIndexableThread = (
  thread: ChikaThreadResponse | null,
): thread is ChikaThreadResponse =>
  !!thread && !thread.isHidden && !thread.categoryPseudonymous;

const threadDescription = (thread: ChikaThreadResponse) =>
  truncateSeoDescription(
    thread.content ||
      `Read this Chika discussion from the Freediving Philippines community.`,
  );

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
  const path = chikaPath(slug);
  const thread = await getPublicThreadMetadata(slug);
  if (!isIndexableThread(thread)) {
    return buildNoindexMetadata({
      title: "Chika | Freediving Philippines",
      description: "This discussion is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${thread.title} | Chika`,
    description: threadDescription(thread),
    path,
  });
}

export default async function ChikaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const thread = await getPublicThreadMetadata(slug);
  const path = chikaPath(slug);
  const h1 = isIndexableThread(thread)
    ? thread.title
    : headingFromSlug(slug, "Chika discussion");

  return (
    <>
      <h1 className="sr-only">{h1}</h1>
      {isIndexableThread(thread) ? (
        <>
          <StructuredData
            data={[
              webPageJsonLd({
                title: `${thread.title} | Chika`,
                description: threadDescription(thread),
                path,
              }),
              breadcrumbJsonLd([
                { name: "Chika", path: "/chika" },
                { name: thread.title, path },
              ]),
              discussionForumPostingJsonLd({
                headline: thread.title,
                text: threadDescription(thread),
                path,
                datePublished: thread.createdAt,
                dateModified: thread.updatedAt,
                authorName: thread.categoryPseudonymous
                  ? undefined
                  : thread.authorDisplayName,
              }),
            ]}
          />
        </>
      ) : null}
      <ChikaDetailClient slug={slug} />
    </>
  );
}
