"use client";

import type { EventFilters, EventType } from "@freediving.ph/types";
import { CalendarClock, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
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

type EventTypeFilter = EventType | "all";
type PriceFilter = "all" | "free" | "paid";

const EVENT_TYPE_FILTER_ITEMS: Array<{
  value: EventTypeFilter;
  label: string;
}> = [{ value: "all", label: "All types" }, ...eventTypeOptions];

const PRICE_FILTER_ITEMS: Array<{ value: PriceFilter; label: string }> = [
  { value: "all", label: "Free or paid" },
  { value: "free", label: "Free events" },
  { value: "paid", label: "Paid events" },
];

export default function EventsPage() {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(24);
  const [diveSiteId, setDiveSiteId] = useState("all");
  const [diveSiteLabel, setDiveSiteLabel] = useState("");
  const [eventType, setEventType] = useState<EventTypeFilter>("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [upcoming, setUpcoming] = useState(true);

  const filters = useMemo<EventFilters>(
    () => ({
      status: "published",
      page: 1,
      limit,
      search: search.trim() || undefined,
      diveSiteId: diveSiteId === "all" ? undefined : diveSiteId,
      type: eventType === "all" ? undefined : eventType,
      price: price === "all" ? undefined : price,
      upcoming,
    }),
    [diveSiteId, eventType, limit, price, search, upcoming],
  );

  const eventsQuery = useEvents(filters);
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const markInterestedMutation = useMarkEventInterested();
  const markUninterestedMutation = useMarkEventUninterested();
  const events = eventsQuery.data?.events ?? [];
  const total = eventsQuery.data?.pagination.total ?? events.length;

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
        title="Events"
        subtitle="Find freediving sessions, trips, courses, and community events."
        action={
          <Button size="sm" render={<Link href="/events/create" />}>
            <Plus className="mr-1 h-4 w-4" />
            Create event
          </Button>
        }
      />

      <section className="space-y-3">
        <CommunityBrowseToolbar
          label={
            <>
              <Search className="h-3.5 w-3.5" />
              Browse
            </>
          }
          title="Browse events"
          description="Search by event name, dive site, or place."
        >
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search events"
                  value={search}
                  onChange={(event) => {
                    setLimit(24);
                    setSearch(event.target.value);
                  }}
                />
              </div>
              <DiveSiteCombobox
                value={diveSiteId}
                valueLabel={diveSiteId === "all" ? undefined : diveSiteLabel}
                onValueChange={(value, site) => {
                  setLimit(24);
                  setDiveSiteId(value);
                  setDiveSiteLabel(site ? `${site.name} · ${site.area}` : "");
                }}
                allOption={{ value: "all", label: "All dive sites" }}
                searchPlaceholder="All dive sites"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Select
                value={eventType}
                onValueChange={(value) => {
                  setLimit(24);
                  setEventType((value ?? "all") as EventTypeFilter);
                }}
                items={EVENT_TYPE_FILTER_ITEMS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_FILTER_ITEMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={price}
                onValueChange={(value) => {
                  setLimit(24);
                  setPrice((value ?? "all") as PriceFilter);
                }}
                items={PRICE_FILTER_ITEMS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_FILTER_ITEMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-fit sm:justify-self-start"
                variant={upcoming ? "default" : "outline"}
                onClick={() => {
                  setLimit(24);
                  setUpcoming((value) => !value);
                }}
              >
                Upcoming
              </Button>
            </div>
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
            title="No events found"
            description="Try changing your filters or create a new event."
            icon={<CalendarClock className="h-5 w-5" />}
            action={
              <Button size="sm" render={<Link href="/events/create" />}>
                Create event
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Showing {events.length} of {total}
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
