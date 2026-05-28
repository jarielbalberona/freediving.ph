import type { Metadata } from "next";

import { ManageSessionsPage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Manage sessions | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageSessionsPage slug={slug} />;
}
