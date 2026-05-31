import type { Metadata } from "next";

import { EventManageClient } from "../../../../events/[slug]/client-page";
import { EventManagementShell } from "@/features/events/components/event-management-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Event settings | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return (
    <EventManagementShell slug={slug}>
      <EventManageClient slug={slug} initialSection="settings" />
    </EventManagementShell>
  );
}
