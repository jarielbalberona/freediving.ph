import type { Metadata } from "next";

import { CourseBookPage } from "@/features/schools/pages/PublicSchoolsPage";

export const metadata: Metadata = {
  title: "Course booking | Freediving Philippines",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;
  return <CourseBookPage slug={slug} courseSlug={courseSlug} />;
}
