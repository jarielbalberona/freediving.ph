import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { EventCheckInClient } from "../../client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const eventCheckInUrl = (slug: string) =>
  `${siteConfig.url}/events/${encodeURIComponent(slug)}/manage/check-in`;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Check-in scanner | Freediving Philippines",
    alternates: { canonical: eventCheckInUrl(slug) },
  };
}

export default async function EventCheckInPage({ params }: PageProps) {
  const { slug } = await params;
  return <EventCheckInClient slug={slug} />;
}
