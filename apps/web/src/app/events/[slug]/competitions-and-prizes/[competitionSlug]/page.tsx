import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { EventCompetitionPrizesClient } from "../../client-page";

type PageProps = {
  params: Promise<{ slug: string; competitionSlug: string }>;
};

const competitionUrl = (slug: string, competitionSlug: string) =>
  `${siteConfig.url}/events/${encodeURIComponent(slug)}/competitions-and-prizes/${encodeURIComponent(competitionSlug)}`;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, competitionSlug } = await params;
  return {
    title: "Competition & prizes | Freediving Philippines",
    alternates: { canonical: competitionUrl(slug, competitionSlug) },
  };
}

export default async function EventCompetitionPrizesPage({
  params,
}: PageProps) {
  const { slug, competitionSlug } = await params;
  return (
    <EventCompetitionPrizesClient
      eventSlug={slug}
      competitionSlug={competitionSlug}
    />
  );
}
