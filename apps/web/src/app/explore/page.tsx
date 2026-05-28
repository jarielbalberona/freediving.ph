import { Suspense } from "react";
import type { Metadata } from "next";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import { ExploreLayout } from "@/features/explore/components/ExploreLayout";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";
import { breadcrumbJsonLd, webPageJsonLd } from "@/features/public-content/seo/jsonLd";

const routePath = "/explore";
const routeTitle =
  "Freediving Dive Spots in the Philippines | Explore Sites and Local Notes";
const routeDescription =
  "Explore community-shared freediving spots in the Philippines with local notes, safety context, and nearby resources.";

export const metadata: Metadata = buildPublicMetadata({
  title: routeTitle,
  description: routeDescription,
  path: routePath,
});

export default function ExplorePage() {
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
            { name: "Explore", path: routePath },
          ]),
        ]}
      />
      <h1 className="sr-only">Explore freediving dive spots in the Philippines</h1>
      <Suspense fallback={<ExploreFallback />}>
        <ExploreLayout />
      </Suspense>
    </>
  );
}

function ExploreFallback() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[720px] items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Loading explore map...</p>
    </div>
  );
}
