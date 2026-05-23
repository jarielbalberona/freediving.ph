import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { EventManageClient } from "../client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const eventManageUrl = (slug: string) =>
  `${siteConfig.url}/events/${encodeURIComponent(slug)}/manage`;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Manage event | Freediving Philippines",
    alternates: { canonical: eventManageUrl(slug) },
  };
}

export default async function EventManagePage({ params }: PageProps) {
  const { slug } = await params;
  return <EventManageClient slug={slug} />;
}
