import type { Metadata } from "next";

import { ManageSchoolPaymentsPage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "School payments | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageSchoolPaymentsPage slug={slug} />;
}
