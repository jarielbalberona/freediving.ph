import type { Metadata } from "next";

import { ManageSchoolInstructorsPage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "School instructors | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageSchoolInstructorsPage slug={slug} />;
}
