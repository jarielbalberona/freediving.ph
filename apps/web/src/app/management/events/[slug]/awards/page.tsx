import type { Metadata } from "next";

import { EventManageClient } from "../../../../events/[slug]/client-page";
import { EventManagementShell } from "@/features/events/components/event-management-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Event awards | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return (
    <EventManagementShell slug={slug}>
      <EventManageClient slug={slug} initialSection="awards" />
    </EventManagementShell>
  );
}
