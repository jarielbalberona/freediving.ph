"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Lock,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/auth/session";
import {
  useEvent,
  useEventAttendees,
  useJoinEvent,
  useLeaveEvent,
} from "@/features/events";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === "string" ? params.id : "";
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const eventQuery = useEvent(eventId);
  const attendeesQuery = useEventAttendees(
    eventId,
    Boolean(eventId) && !eventQuery.isError,
  );
  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();

  const event = eventQuery.data;

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Events"
          title="Opening event"
          subtitle="Loading schedule, location, and attendance details."
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/events" />}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Events
            </Button>
          }
        />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Events"
          title="Event unavailable"
          subtitle="This event is taking longer than expected to open."
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/events" />}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Events
            </Button>
          }
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {getApiErrorMessage(
            eventQuery.error,
            "This event is taking longer than expected to open. Try again in a moment.",
          )}
        </div>
      </CommunityPageShell>
    );
  }

  const handleJoin = () => {
    joinMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Joined event."),
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error(
              "Sign in first, or make sure you actually have access to this event.",
            );
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to join event"));
        },
      },
    );
  };

  const handleLeave = () => {
    leaveMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Left event."),
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error("You do not have permission to leave this event.");
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to leave event"));
        },
      },
    );
  };

  const actionState = getEventActionState(event, isSignedIn);
  const attendees = attendeesQuery.data?.attendees ?? [];

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Events"
        title={event.title}
        subtitle={
          event.description?.trim() ||
          "Details have not been added yet. Ask the organizer before joining."
        }
        action={
          <Button size="sm" variant="outline" render={<Link href="/events" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Events
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="h-5 px-2 text-[11px]">
            {titleCase(event.type || "training")}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {titleCase(event.visibility.replace("_", " "))}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {titleCase(event.difficulty)}
          </Badge>
        </div>
      </CommunityHeader>

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailFact
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Schedule"
          value={formatEventDate(event.startsAt, event.endsAt)}
        />
        <DetailFact
          icon={<Users className="h-3.5 w-3.5" />}
          label="Attendees"
          value={`${event.currentAttendees}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""} active`}
        />
        <DetailFact
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Location"
          value={event.location || "Location not set"}
        />
        <DetailFact
          icon={
            event.visibility === "public" ? (
              <Ticket className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )
          }
          label="Access"
          value={visibilityDetail(event.visibility)}
        />
      </div>

      <section className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Attendance
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {actionState.description}
            </p>
          </div>
          <div className="shrink-0">
            {actionState.kind === "join" ? (
              <Button
                size="sm"
                disabled={
                  joinMutation.isPending || event.status !== "published"
                }
                onClick={handleJoin}
              >
                Join event
              </Button>
            ) : null}
            {actionState.kind === "leave" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={leaveMutation.isPending}
                onClick={handleLeave}
              >
                Leave event
              </Button>
            ) : null}
            {actionState.kind === "signin" ? (
              <SignInButton mode="modal">
                <Button size="sm">Sign in to join</Button>
              </SignInButton>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Public events are visible to guests. Restricted events may require
            group access or an organizer invite.
          </p>
        </div>
      </section>

      <DetailSection
        title="What to expect"
        description="A quick check on fit, access, and level."
      >
        <div className="divide-y divide-border/70 border-y border-border/70 text-sm">
          <DetailRow
            label="Access"
            value={visibilityDetail(event.visibility)}
          />
          <DetailRow label="Difficulty" value={titleCase(event.difficulty)} />
          <DetailRow label="Type" value={event.type || "training"} />
        </div>
      </DetailSection>

      <DetailSection
        title="Attendees"
        description="Visible attendee records for this event."
      >
        {attendeesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : attendeesQuery.error ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(
              attendeesQuery.error,
              "Attendees are taking longer than expected to appear.",
            )}
          </p>
        ) : attendees.length === 0 ? (
          <CommunityEmptyState
            title="No attendees yet"
            description="Attendees will appear here as divers join."
          />
        ) : (
          <div className="divide-y divide-border/70 border-y border-border/70">
            {attendees.map((attendee) => (
              <div
                key={attendee.userId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <UserIdentityHeader
                  displayName={
                    attendee.displayName || attendee.username || attendee.userId
                  }
                  username={attendee.username}
                  avatarUrl={attendee.avatarUrl ?? undefined}
                  usernameFallback="attendee"
                />
                <Badge variant="outline" className="h-5 px-2 text-[11px]">
                  {titleCase(attendee.role)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </CommunityPageShell>
  );
}

function getEventActionState(
  event: { viewerJoined: boolean; status: string; visibility: string },
  isSignedIn: boolean,
) {
  if (!isSignedIn) {
    return {
      kind: "signin" as const,
      description:
        "Guests can read public event details, but joining requires a signed-in member account.",
    };
  }
  if (event.viewerJoined) {
    return {
      kind: "leave" as const,
      description: "You are already attending this event.",
    };
  }
  if (event.status !== "published") {
    return {
      kind: "info" as const,
      description: "This event is not published, so it is not joinable.",
    };
  }
  if (event.visibility !== "public") {
    return {
      kind: "join" as const,
      description:
        "This event is restricted. Join only if you have group access or an organizer invite.",
    };
  }
  return {
    kind: "join" as const,
    description: "This event is public and published.",
  };
}

function DetailFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatEventDate(start?: string, end?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime()))
    return "Schedule not set";
  if (!endDate || Number.isNaN(endDate.getTime())) {
    return startDate.toLocaleString();
  }
  return `${startDate.toLocaleString()} to ${endDate.toLocaleString()}`;
}

function visibilityDetail(value: string) {
  switch (value) {
    case "group_members":
      return "Group members only";
    case "invite_only":
      return "Invite only";
    default:
      return "Public";
  }
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
