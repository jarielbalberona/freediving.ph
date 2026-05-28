import type { Metadata } from "next";

import { ManageBookingsPage } from "@/features/schools/pages/ManageSchoolsPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Manage bookings | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <ManageBookingsPage slug={slug} />;
}
