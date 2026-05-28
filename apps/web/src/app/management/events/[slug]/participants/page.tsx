import type { Metadata } from "next";

import { EventManagementSectionPlaceholder } from "@/features/events/components/event-management-section";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Event participants | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return (
    <EventManagementSectionPlaceholder
      slug={slug}
      title="Event participants"
      description="Participants management is coming soon in the workspace shell. Use the public event workspace actions for now."
    />
  );
}
