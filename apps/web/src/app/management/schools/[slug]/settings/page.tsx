import type { Metadata } from "next";

import { ManageSchoolSettingsPage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "School settings | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageSchoolSettingsPage slug={slug} />;
}
