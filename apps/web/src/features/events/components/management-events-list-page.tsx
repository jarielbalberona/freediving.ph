"use client";

import type { Event } from "@freediving.ph/types";
import { DEFAULT_TIMEZONE } from "@freediving.ph/config";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";

import { ManagementEntityCard } from "@/components/layout/management-entity-card";
import { ManagementPageContainer } from "@/components/layout/management-page-container";
import {
  CommunityEmptyState,
  CommunityHeader,
} from "@/components/community/community-page";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { useEvents } from "@/features/events/hooks/queries";

export function ManagementEventsListPage() {
  const session = useSession();
  const eventsQuery = useEvents(undefined, session.status === "signed_in");

  if (session.status === "loading") {
    return null;
  }

  if (session.status !== "signed_in") {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Events"
          description="Sign in to access events you manage."
        />
      </ManagementPageContainer>
    );
  }

  if (eventsQuery.isLoading) {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState title="Loading" description="Loading managed events..." />
      </ManagementPageContainer>
    );
  }

  if (eventsQuery.isError || !eventsQuery.data) {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Could not load events"
          description="Unable to load your managed events right now. Please try again."
        />
      </ManagementPageContainer>
    );
  }

  const managedEvents = eventsQuery.data.events.filter((event) => event.viewerCanManage);

  return (
    <ManagementPageContainer variant="wide">
      <CommunityHeader
        title="Events"
        subtitle="Event management is for organizers who own or moderate events."
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/events/create" />}
          >
            <Plus />
            Add event
          </Button>
        }
      />

      {managedEvents.length === 0 ? (
        <CommunityEmptyState
          title="Event management"
          description="Manage events you own or moderate from the item workspace."
          action={
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/events" />}
            >
              <CalendarClock />
              Explore public events
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managedEvents.map((event) => (
            <EventManagementCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </ManagementPageContainer>
  );
}

function EventManagementCard({ event }: { event: Event }) {
  return (
    <ManagementEntityCard
      title={event.title}
      description={event.shortDescription || event.description}
      location={
        event.locationName || event.location || event.diveSite?.name || "Location not set"
      }
      status={event.status}
      href={`/management/events/${encodeURIComponent(event.slug)}`}
      coverImage={event.coverPhotoUrl ?? null}
      placeholderIcon={CalendarClock}
      stats={[
        { label: "Status", value: event.status },
        {
          label: "Visibility",
          value:
            event.visibility === "private"
              ? "Private"
              : "Public",
        },
        {
          label: "Date",
          value: formatManagementDate(event.startsAt, event.endsAt, event.timezone),
        },
        {
          label: "Participants",
          value: String(event.goingCount ?? 0),
        },
        {
          label: "Interested",
          value: String(event.interestedCount ?? 0),
        },
      ]}
    />
  );
}

function formatManagementDate(
  start?: string,
  end?: string,
  timezone?: string,
) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return "Date not set";
  }

  const formatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || DEFAULT_TIMEZONE,
  });

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
}
