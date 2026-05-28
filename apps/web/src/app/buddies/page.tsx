import type { Metadata } from "next";
import { Suspense } from "react";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import { breadcrumbJsonLd, webPageJsonLd } from "@/features/public-content/seo/jsonLd";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

import BuddiesPageClient from "./client-page";

const routePath = "/buddies";
const routeTitle =
  "Find Freediving Buddies in the Philippines | Freediving Philippines";
const routeDescription =
  "Find freediving buddies, connect with nearby divers, and plan safer sessions with the Freediving Philippines community.";

export const metadata: Metadata = buildPublicMetadata({
  title: routeTitle,
  description: routeDescription,
  path: routePath,
});

export default function BuddiesPage() {
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
            { name: "Buddies", path: routePath },
          ]),
        ]}
      />
      <Suspense
        fallback={
          <div className="py-12 text-center text-muted-foreground">
            Loading buddies...
          </div>
        }
      >
        <BuddiesPageClient />
      </Suspense>
    </>
  );
}
