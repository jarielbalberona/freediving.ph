import type { Metadata } from "next";

import { SchoolsBrowsePage } from "@/features/schools/pages/PublicSchoolsPage";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";
import { StructuredData } from "@/features/public-content/components/StructuredData";
import { breadcrumbJsonLd, webPageJsonLd } from "@/features/public-content/seo/jsonLd";

const routePath = "/schools";
const routeTitle =
  "Freediving Schools in the Philippines | Courses and Local Training";
const routeDescription =
  "Find freediving schools, courses, and instructors in the Philippines, with public school details and local training context.";

export const metadata: Metadata = buildPublicMetadata({
  title: routeTitle,
  description: routeDescription,
  path: routePath,
});

export default function Page() {
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
            { name: "Schools", path: routePath },
          ]),
        ]}
      />
      <SchoolsBrowsePage />
    </>
  );
}
