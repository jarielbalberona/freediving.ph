import type { Metadata } from "next";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import { breadcrumbJsonLd, webPageJsonLd } from "@/features/public-content/seo/jsonLd";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

import GroupsPageClient from "./client-page";

const routePath = "/groups";
const routeTitle =
  "Freediving Groups in the Philippines | Join Local Communities";
const routeDescription =
  "Find freediving groups, clubs, schools, and local communities across the Philippines.";

export const metadata: Metadata = buildPublicMetadata({
  title: routeTitle,
  description: routeDescription,
  path: routePath,
});

export default function GroupsPage() {
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
            { name: "Groups", path: routePath },
          ]),
        ]}
      />
      <GroupsPageClient />
    </>
  );
}
