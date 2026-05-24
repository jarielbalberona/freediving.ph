import type { Metadata } from "next";
import type { PublicCourse, PublicSchool } from "@freediving.ph/types";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  breadcrumbJsonLd,
  webPageJsonLd,
} from "@/features/public-content/seo/jsonLd";
import {
  buildNoindexMetadata,
  buildPublicMetadata,
  truncateSeoDescription,
} from "@/features/public-content/seo/metadata";
import { SchoolCoursesPage } from "@/features/schools/pages/PublicSchoolsPage";
import { fphgoFetchServer } from "@/lib/api/fphgo-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type PublicCoursesPayload = {
  school: PublicSchool;
  courses: PublicCourse[];
};

const coursesPath = (slug: string) =>
  `/schools/${encodeURIComponent(slug)}/courses` as const;

const getPublicCourses = (slug: string) =>
  fphgoFetchServer<PublicCoursesPayload>(
    `/v1/schools/${encodeURIComponent(slug)}/courses`,
  );

const coursesDescription = (school: PublicSchool, courses: PublicCourse[]) =>
  truncateSeoDescription(
    courses.length > 0
      ? `Browse freediving courses from ${school.name}, including beginner sessions, training options, and upcoming ways to learn.`
      : `Browse freediving courses and learning options from ${school.name}.`,
  );

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getPublicCourses(slug);
  const path = coursesPath(slug);

  if (!payload?.school) {
    return buildNoindexMetadata({
      title: "Freediving courses | Freediving Philippines",
      description: "These courses are not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${payload.school.name} Courses | Freediving Philippines`,
    description: coursesDescription(payload.school, payload.courses),
    path,
  });
}

export default async function Page({
  params,
}: PageProps) {
  const { slug } = await params;
  const payload = await getPublicCourses(slug);
  const path = coursesPath(slug);

  return (
    <>
      {payload?.school ? (
        <StructuredData
          data={[
            webPageJsonLd({
              title: `${payload.school.name} Courses | Freediving Philippines`,
              description: coursesDescription(payload.school, payload.courses),
              path,
            }),
            breadcrumbJsonLd([
              { name: "Schools", path: "/schools" },
              {
                name: payload.school.name,
                path: `/schools/${payload.school.slug}`,
              },
              { name: "Courses", path },
            ]),
          ]}
        />
      ) : null}
      <SchoolCoursesPage slug={slug} />
    </>
  );
}
