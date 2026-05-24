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
import { CourseDetailPage } from "@/features/schools/pages/PublicSchoolsPage";
import { fphgoFetchServer } from "@/lib/api/fphgo-server";

type PageProps = {
  params: Promise<{ slug: string; courseSlug: string }>;
};

type PublicCoursePayload = {
  school: PublicSchool;
  course: PublicCourse;
};

const coursePath = (slug: string, courseSlug: string) =>
  `/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}` as const;

const getPublicCourse = (slug: string, courseSlug: string) =>
  fphgoFetchServer<PublicCoursePayload>(
    `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`,
  );

const courseDescription = (school: PublicSchool, course: PublicCourse) =>
  truncateSeoDescription(
    course.shortDescription ||
      course.descriptionMarkdown ||
      [
        `${course.title} from ${school.name}`,
        course.locationLabel || school.baseLocationLabel,
        course.durationLabel,
      ]
        .filter(Boolean)
        .join(". "),
  );

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, courseSlug } = await params;
  const payload = await getPublicCourse(slug, courseSlug);
  const path = coursePath(slug, courseSlug);

  if (!payload?.school || !payload.course) {
    return buildNoindexMetadata({
      title: "Freediving course | Freediving Philippines",
      description: "This course is not currently available for public search.",
      path,
    });
  }

  return buildPublicMetadata({
    title: `${payload.course.title} | ${payload.school.name}`,
    description: courseDescription(payload.school, payload.course),
    path,
  });
}

export default async function Page({
  params,
}: PageProps) {
  const { slug, courseSlug } = await params;
  const payload = await getPublicCourse(slug, courseSlug);
  const path = coursePath(slug, courseSlug);

  return (
    <>
      {payload?.school && payload.course ? (
        <StructuredData
          data={[
            webPageJsonLd({
              title: `${payload.course.title} | ${payload.school.name}`,
              description: courseDescription(payload.school, payload.course),
              path,
            }),
            breadcrumbJsonLd([
              { name: "Schools", path: "/schools" },
              {
                name: payload.school.name,
                path: `/schools/${payload.school.slug}`,
              },
              {
                name: "Courses",
                path: `/schools/${payload.school.slug}/courses`,
              },
              { name: payload.course.title, path },
            ]),
          ]}
        />
      ) : null}
      <CourseDetailPage slug={slug} courseSlug={courseSlug} />
    </>
  );
}
