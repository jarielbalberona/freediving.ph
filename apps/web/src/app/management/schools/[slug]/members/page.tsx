import { ManageSchoolMembersPage } from "@/features/schools/pages/ManageSchoolsPage";

export const metadata = {
  title: "School members | Freediving Philippines",
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ManageSchoolMembersPage slug={slug} />;
}
