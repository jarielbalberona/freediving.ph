import type { Metadata } from "next";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import { breadcrumbJsonLd, webPageJsonLd } from "@/features/public-content/seo/jsonLd";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

import EventsPageClient from "./client-page";

const routePath = "/events";
const routeTitle =
  "Freediving Events in the Philippines | Community Dives and Meetups";
const routeDescription =
  "Browse freediving events, community dives, meetups, cleanups, and activities around the Philippines.";

export const metadata: Metadata = buildPublicMetadata({
  title: routeTitle,
  description: routeDescription,
  path: routePath,
});

export default function EventsPage() {
  return (
    <>
      <StructuredData
        data={[
          webPageJsonLd({
            title: routeTitle,
            description: routeDescription,
            path: routePath,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Events", path: routePath },
          ]),
        ]}
      />
      <EventsPageClient />
    </>
  );
}
