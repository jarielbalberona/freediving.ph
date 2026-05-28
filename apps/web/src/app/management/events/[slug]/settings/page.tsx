import type { Metadata } from "next";

import { EventManagementSectionPlaceholder } from "@/features/events/components/event-management-section";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Event settings | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return (
    <EventManagementSectionPlaceholder
      slug={slug}
      title="Event settings"
      description="Settings management is coming soon in this workspace shell."
    />
  );
}
