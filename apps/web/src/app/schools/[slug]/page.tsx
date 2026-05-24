import { SchoolProfilePage } from "@/features/schools/pages/PublicSchoolsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SchoolProfilePage slug={slug} />;
}
