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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";

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
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-72 w-full rounded-[2rem]" />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Skeleton className="h-80 w-full rounded-[1.75rem]" />
            <Skeleton className="h-80 w-full rounded-[1.75rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link href="/events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to events
            </Button>
          </Link>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-sm text-destructive">
              {getApiErrorMessage(eventQuery.error, "Failed to load event details")}
            </CardContent>
          </Card>
        </div>
      </div>
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.1),_transparent_26%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.24)_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to events
            </Button>
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground">
                  {titleCase(event.status)}
                </Badge>
                <Badge variant="outline">
                  {titleCase(event.visibility.replace("_", " "))}
                </Badge>
                <Badge variant="outline">{event.type || "training"}</Badge>
                <Badge variant="outline">{titleCase(event.difficulty)}</Badge>
              </div>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
                  {event.title}
                </h1>
                <p className="max-w-3xl text-base text-muted-foreground">
                  {event.description?.trim() ||
                    "No description. That is weak. People should know what they are joining before they commit."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailFact
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Schedule"
                  value={formatEventDate(event.startsAt, event.endsAt)}
                />
                <DetailFact
                  icon={<Users className="h-4 w-4" />}
                  label="Attendees"
                  value={`${event.currentAttendees}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""} active`}
                />
                <DetailFact
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={event.location || "Location not set"}
                />
                <DetailFact
                  icon={
                    event.visibility === "public" ? (
                      <Ticket className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )
                  }
                  label="Access"
                  value={visibilityDetail(event.visibility)}
                />
              </div>
            </div>

            <Card className="border-border/70 bg-[linear-gradient(180deg,_hsl(var(--primary)/0.14)_0%,_hsl(var(--card))_100%)]">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl text-foreground">Attendance</CardTitle>
                <CardDescription className="text-sm text-foreground/75">
                  Join and leave actions follow backend rules. Organizer
                  memberships cannot leave directly, and restricted visibility
                  is still restricted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-foreground/80">
                  {actionState.description}
                </div>
                {actionState.kind === "join" ? (
                  <Button
                    className="w-full"
                    disabled={joinMutation.isPending || event.status !== "published"}
                    onClick={handleJoin}
                  >
                    Join event
                  </Button>
                ) : null}
                {actionState.kind === "leave" ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={leaveMutation.isPending}
                    onClick={handleLeave}
                  >
                    Leave event
                  </Button>
                ) : null}
                {actionState.kind === "signin" ? (
                  <SignInButton mode="modal">
                    <Button className="w-full">Sign in to join</Button>
                  </SignInButton>
                ) : null}
                <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p>
                      Public events can be discovered by guests. Group-member
                      and invite-only events depend on actual access, not
                      frontend optimism.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>What to expect</CardTitle>
              <CardDescription>
                The detail page should answer practical questions first: what it
                is, when it starts, where it happens, and whether you can
                actually attend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Status:{" "}
                <span className="font-medium text-foreground">
                  {titleCase(event.status)}
                </span>
              </p>
              <p>
                Visibility:{" "}
                <span className="font-medium text-foreground">
                  {titleCase(event.visibility.replace("_", " "))}
                </span>
              </p>
              <p>
                Difficulty:{" "}
                <span className="font-medium text-foreground">
                  {titleCase(event.difficulty)}
                </span>
              </p>
              <p>
                Type:{" "}
                <span className="font-medium text-foreground">
                  {event.type || "training"}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
              <CardDescription>
                Visible attendee records for this event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendeesQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : attendeesQuery.error ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(attendeesQuery.error, "Failed to load attendees")}
                </p>
              ) : attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active attendees yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.userId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={attendee.avatarUrl ?? undefined}
                          displayName={
                            attendee.displayName ??
                            attendee.username ??
                            attendee.userId
                          }
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {attendee.displayName ||
                              attendee.username ||
                              attendee.userId}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {attendee.username || attendee.userId}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{titleCase(attendee.role)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
      description:
        "You are already in. Leaving removes your attendee membership unless your role is organizer, which the backend blocks on purpose.",
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
        "This event is restricted. If you can see this page and still have valid access, the join action can proceed. Otherwise the backend will reject it.",
    };
  }
  return {
    kind: "join" as const,
    description: "This event is public and published. If it looks legitimate, join it.",
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
    <div className="rounded-3xl border border-border/60 bg-background/75 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function formatEventDate(start?: string, end?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return "Schedule not set";
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
