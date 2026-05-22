"use client";

import type { EventDifficulty, EventFilters, EventType } from "@freediving.ph/types";
import { SignInButton } from "@clerk/nextjs";
import { CalendarClock, Compass, Plus, Search, Ticket } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CommunityAccessNote,
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
  CommunityStats,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  difficultyOptions,
  EventCard,
  eventTypeOptions,
  useEvents,
  useJoinEvent,
  useLeaveEvent,
  useMarkEventInterested,
  useMarkEventUninterested,
} from "@/features/events";
import { useSession } from "@/features/auth/session";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";

export default function EventsPage() {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(24);
  const [diveSiteId, setDiveSiteId] = useState("");
  const [diveSiteLabel, setDiveSiteLabel] = useState("");
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [difficulty, setDifficulty] = useState<EventDifficulty | "all">("all");
  const [beginnerFriendly, setBeginnerFriendly] = useState<"all" | "true">(
    "all",
  );
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");
  const [upcoming, setUpcoming] = useState(true);

  const filters = useMemo<EventFilters>(
    () => ({
      status: "published",
      page: 1,
      limit,
      search: search.trim() || undefined,
      diveSiteId: diveSiteId || undefined,
      type: eventType === "all" ? undefined : eventType,
      difficulty: difficulty === "all" ? undefined : difficulty,
      beginnerFriendly: beginnerFriendly === "true" ? true : undefined,
      price: price === "all" ? undefined : price,
      upcoming,
    }),
    [
      beginnerFriendly,
      difficulty,
      diveSiteId,
      eventType,
      limit,
      price,
      search,
      upcoming,
    ],
  );

  const eventsQuery = useEvents(filters);
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const markInterestedMutation = useMarkEventInterested();
  const markUninterestedMutation = useMarkEventUninterested();
  const events = eventsQuery.data?.events ?? [];
  const total = eventsQuery.data?.pagination.total ?? events.length;
  const joinedCount = events.filter(
    (event) => event.viewerEventState === "going",
  ).length;

  const handleJoinEvent = (eventId: string) => {
    joinEventMutation.mutate(
      { eventId },
      {
        onSuccess: (participant) => {
          toast.success(
            participant.status === "pending_approval"
              ? "Request sent."
              : "Joined event.",
          );
        },
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error("Sign in first before joining this event.");
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to join event"));
        },
      },
    );
  };

  const handleLeaveEvent = (eventId: string) => {
    leaveEventMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Left event."),
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to leave event"));
        },
      },
    );
  };

  const handleMarkInterested = (eventId: string) => {
    markInterestedMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Marked interested."),
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error("Sign in first before marking interest.");
            return;
          }
          toast.error(
            getApiErrorMessage(error, "Failed to mark event interested"),
          );
        },
      },
    );
  };

  const handleMarkUninterested = (eventId: string) => {
    markUninterestedMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Removed interest."),
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Failed to remove event interest"),
          );
        },
      },
    );
  };

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Calendar"
        title="Events"
        subtitle="Browse freediving trainings, trips, fun dives, workshops, and community sessions around the Philippines."
        action={
          !isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="sm">Sign in to join</Button>
            </SignInButton>
          ) : (
            <Button size="sm" render={<Link href="/events/create" />}>
              <Plus className="mr-2 h-4 w-4" />
              Create event
            </Button>
          )
        }
      />

      <CommunityStats
        items={[
          {
            label: "Published",
            value: String(total),
            icon: <Compass className="h-3.5 w-3.5" />,
          },
          {
            label: "Joined",
            value: isSignedIn ? String(joinedCount) : "0",
            icon: <Ticket className="h-3.5 w-3.5" />,
          },
          {
            label: "Default zone",
            value: "Asia/Manila",
            icon: <CalendarClock className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <CommunityAccessNote>
        Public events expose full details. Private events can appear here, but
        details, payment instructions, and attendee identities stay hidden until
        you are an approved participant or organizer.
      </CommunityAccessNote>

      <section className="space-y-3">
        <CommunityBrowseToolbar
          label={
            <>
              <CalendarClock className="h-3.5 w-3.5" />
              Browse
            </>
          }
          title="Discover events"
          description="Filter by dive site, event type, difficulty, price, and beginner fit."
        >
          <div className="grid gap-2 lg:grid-cols-[1.35fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search events, dive sites, or places"
                value={search}
                onChange={(event) => {
                  setLimit(24);
                  setSearch(event.target.value);
                }}
              />
            </div>
            <DiveSiteCombobox
              value={diveSiteId}
              valueLabel={diveSiteLabel}
              onValueChange={(value, site) => {
                setLimit(24);
                setDiveSiteId(value);
                setDiveSiteLabel(
                  site ? `${site.name} · ${site.area}` : "",
                );
              }}
              allOption={{ value: "", label: "All dive sites" }}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              value={eventType}
              onValueChange={(value) => {
                setLimit(24);
                setEventType(value as EventType | "all");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={difficulty}
              onValueChange={(value) => {
                setLimit(24);
                setDifficulty(value as EventDifficulty | "all");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulty</SelectItem>
                {difficultyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={beginnerFriendly}
              onValueChange={(value) => {
                setLimit(24);
                setBeginnerFriendly(value as "all" | "true");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Beginner fit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="true">Beginner-friendly</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={price}
              onValueChange={(value) => {
                setLimit(24);
                setPrice(value as "all" | "free" | "paid");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Free or paid</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={upcoming ? "default" : "outline"}
              onClick={() => {
                setLimit(24);
                setUpcoming((value) => !value);
              }}
            >
              Upcoming
            </Button>
          </div>
        </CommunityBrowseToolbar>

        {eventsQuery.isLoading ? (
          <EventGridSkeleton />
        ) : eventsQuery.error ? (
          <Card className="border-destructive/30 bg-destructive/5 py-0">
            <CardContent className="p-3 text-xs text-destructive">
              {getApiErrorMessage(
                eventsQuery.error,
                "Events are taking longer than expected. Try again in a moment.",
              )}
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <CommunityEmptyState
            title="No matching events"
            description="Try a broader filter or create the first session for this dive site."
            icon={<CalendarClock className="h-5 w-5" />}
            action={
              isSignedIn ? (
                <Button size="sm" render={<Link href="/events/create" />}>
                  Create event
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Showing {events.length} of {total} events
              </span>
              <Badge variant="outline">
                {upcoming ? "Upcoming only" : "All published"}
              </Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onJoin={isSignedIn ? handleJoinEvent : undefined}
                  onLeave={handleLeaveEvent}
                  onMarkInterested={handleMarkInterested}
                  onMarkUninterested={handleMarkUninterested}
                  isInterestPending={
                    (markInterestedMutation.isPending &&
                      markInterestedMutation.variables?.eventId === event.id) ||
                    (markUninterestedMutation.isPending &&
                      markUninterestedMutation.variables?.eventId === event.id)
                  }
                  showActions={isSignedIn}
                />
              ))}
            </div>
            {events.length < total ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setLimit((value) => value + 24)}
                  disabled={eventsQuery.isFetching}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </CommunityPageShell>
  );
}

function EventGridSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}
