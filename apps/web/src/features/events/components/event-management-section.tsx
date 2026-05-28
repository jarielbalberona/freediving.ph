"use client";

import { CommunityEmptyState } from "@/components/community/community-page";
import { EventManagementShell } from "./event-management-shell";

export function EventManagementOverviewPage({ slug }: { slug: string }) {
  const title = "Event management";
  const description =
    "Use the workspace sections to configure participants, checks, program, payments, and event details.";

  return (
    <EventManagementShell slug={slug}>
      <CommunityEmptyState
        title={title}
        description={description}
        action={
          <a
            className="text-sm text-primary underline"
            href={`/events/${encodeURIComponent(slug)}`}
          >
            View public event page
          </a>
        }
      />
    </EventManagementShell>
  );
}

export function EventManagementSectionPlaceholder({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) {
  return (
    <EventManagementShell slug={slug}>
      <CommunityEmptyState title={title} description={description} />
    </EventManagementShell>
  );
}
