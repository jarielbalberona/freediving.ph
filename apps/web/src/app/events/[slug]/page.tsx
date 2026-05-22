import type { Metadata } from "next";

import type { Event } from "@freediving.ph/types";

import { siteConfig } from "@/config/site";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import EventDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type EventPayload = {
  event: Event;
};

const eventUrl = (slug: string) => `${siteConfig.url}/events/${encodeURIComponent(slug)}`;

async function getPublicEventMetadata(slug: string): Promise<Event | null> {
  try {
    const response = await fetch(
      `${getFphgoBaseUrlServer()}/v1/events/${encodeURIComponent(slug)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as EventPayload;
    return payload.event;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonical = eventUrl(slug);
  const event = await getPublicEventMetadata(slug);
  const title = event ? `${event.title} | Events` : "Event | Freediving Philippines";
  const description =
    event?.shortDescription ||
    event?.description ||
    "Freediving Philippines event.";

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

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
