import { CourseDetailPage } from "@/features/schools/pages/PublicSchoolsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;
  return <CourseDetailPage slug={slug} courseSlug={courseSlug} />;
}
