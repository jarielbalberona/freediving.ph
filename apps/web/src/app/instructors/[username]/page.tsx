import type { Metadata } from "next";
import type { InstructorApplicationResponse } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  personJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { fphgoFetchServer } from "@/lib/api/fphgo-server";
import { PublicInstructorPage } from "./client-page";

type PageProps = {
  params: Promise<{ username: string }>;
};

const instructorPath = (username: string) =>
  `/instructors/${encodeURIComponent(username)}` as const;

const getPublicInstructor = (username: string) =>
  fphgoFetchServer<InstructorApplicationResponse>(
    `/v1/instructors/${encodeURIComponent(username)}`,
  );

const instructorDescription = (
  profile: NonNullable<InstructorApplicationResponse["application"]["profile"]>,
) =>
  truncateSeoDescription(
    profile.bio ||
      [
        profile.homeLocationLabel,
        "Verified freediving instructor on Freediving Philippines.",
      ]
        .filter(Boolean)
        .join(". "),
  );

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const payload = await getPublicInstructor(username);
  const profile = payload?.application.profile;
  const path = instructorPath(username);

  if (!profile || profile.verificationStatus !== "verified") {
    return buildNoindexMetadata({
      title: "Instructor profile | Freediving Philippines",
      description:
        "This instructor profile is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${profile.displayName || profile.username} | Freediving Instructor`,
    description: instructorDescription(profile),
    path,
  });
}

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  const payload = await getPublicInstructor(username);
  const profile = payload?.application.profile;
  const path = instructorPath(username);

  return (
    <>
      {profile?.verificationStatus === "verified" ? (
        <StructuredData
          data={[
            webPageJsonLd({
              title: `${profile.displayName || profile.username} | Freediving Instructor`,
              description: instructorDescription(profile),
              path,
            }),
            breadcrumbJsonLd([
              { name: "Instructors", path: "/instructors" },
              { name: profile.displayName || profile.username, path },
            ]),
            personJsonLd({
              name: profile.displayName || profile.username,
              description: instructorDescription(profile),
              path,
              location: profile.homeLocationLabel || profile.formattedAddress,
              sameAs: [profile.websiteUrl, ...profile.socialLinks.split(/\s+/)]
                .map((value) => value.trim())
                .filter((value) => value.startsWith("http")),
            }),
          ]}
        />
      ) : null}
      <PublicInstructorPage username={username} />
    </>
  );
}
