import type { Metadata } from "next";
import type { PublicSchool } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  localBusinessJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { SchoolProfilePage } from "@/features/schools/pages/PublicSchoolsPage";
import { fphgoFetchServer } from "@/lib/api/fphgo-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type PublicSchoolPayload = {
  school: PublicSchool;
};

const schoolPath = (slug: string) => `/schools/${encodeURIComponent(slug)}` as const;

const getPublicSchool = (slug: string) =>
  fphgoFetchServer<PublicSchoolPayload>(`/v1/schools/${encodeURIComponent(slug)}`);

const schoolDescription = (school: PublicSchool) =>
  truncateSeoDescription(
    school.shortDescription ||
      school.descriptionMarkdown ||
      [
        school.baseLocationLabel ||
          school.formattedAddress ||
          school.baseLocation,
        "Find freediving courses, sessions, and school details.",
      ]
        .filter(Boolean)
        .join(". "),
  );

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getPublicSchool(slug);
  const path = schoolPath(slug);

  if (!payload?.school) {
    return buildNoindexMetadata({
      title: "Freediving school | Freediving Philippines",
      description: "This school is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${payload.school.name} | Freediving School`,
    description: schoolDescription(payload.school),
    path,
  });
}

export default async function Page({
  params,
}: PageProps) {
  const { slug } = await params;
  const payload = await getPublicSchool(slug);
  const school = payload?.school;
  const path = schoolPath(slug);

  return (
    <>
      {school ? (
        <StructuredData
          data={[
            webPageJsonLd({
              title: `${school.name} | Freediving School`,
              description: schoolDescription(school),
              path,
            }),
            breadcrumbJsonLd([
              { name: "Schools", path: "/schools" },
              { name: school.name, path },
            ]),
            localBusinessJsonLd({
              name: school.name,
              description: schoolDescription(school),
              path,
              address:
                school.formattedAddress ||
                school.baseLocationLabel ||
                school.baseLocation,
              sameAs: [
                school.websiteUrl,
                school.facebookUrl,
                school.instagramUrl,
              ].filter(Boolean),
            }),
          ]}
        />
      ) : null}
      <SchoolProfilePage slug={slug} />
    </>
  );
}
