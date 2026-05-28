import type { Metadata } from "next";

import { ManageSchoolProfilePage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "School profile | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageSchoolProfilePage slug={slug} />;
}
