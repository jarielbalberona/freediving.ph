import type { Metadata } from "next";

import type { Event } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  eventJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

import EventDetailClient from "./client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type EventPayload = {
  event: Event;
};

const eventPath = (slug: string) => `/events/${encodeURIComponent(slug)}` as const;

const isIndexableEvent = (event: Event | null): event is Event =>
  event?.status === "published" && event.visibility === "public";

const stripMarkdown = (value: string) =>
  value
    .replace(/[`*_>#-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const eventDescription = (event: Event) =>
  truncateSeoDescription(
    event.shortDescription ||
      stripMarkdown(event.descriptionMarkdown || event.description || "") ||
      [
        event.locationName || event.formattedAddress || event.location,
        "Join this freediving event and connect with the community.",
      ]
        .filter(Boolean)
        .join(". "),
  );

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
  const path = eventPath(slug);
  const event = await getPublicEventMetadata(slug);
  if (!isIndexableEvent(event)) {
    return buildNoindexMetadata({
      title: "Event | Freediving Philippines",
      description: "This event is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${event.title} | Freediving Events`,
    description: eventDescription(event),
    path,
    image: event.coverUrl ?? event.coverPhotoUrl ?? undefined,
  });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getPublicEventMetadata(slug);
  const path = eventPath(slug);

  return (
    <>
      {isIndexableEvent(event) ? (
        <StructuredData
          data={[
            webPageJsonLd({
              title: `${event.title} | Freediving Events`,
              description: eventDescription(event),
              path,
            }),
            breadcrumbJsonLd([
              { name: "Events", path: "/events" },
              { name: event.title, path },
            ]),
            eventJsonLd({
              name: event.title,
              description: eventDescription(event),
              path,
              startDate: event.startsAt,
              endDate: event.endsAt,
              locationName:
                event.locationName || event.formattedAddress || event.location,
              address: event.formattedAddress || event.location,
              image: event.coverUrl ?? event.coverPhotoUrl ?? undefined,
            }),
          ]}
        />
      ) : null}
      <EventDetailClient slug={slug} />
    </>
  );
}
