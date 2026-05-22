"use client";

import { useEvents } from "../hooks";
import { EventCard } from "./EventCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import type { EventFilters } from "@freediving.ph/types";

interface EventListProps {
  filters?: EventFilters;
  showCreateButton?: boolean;
  onEventJoin?: (eventId: string) => void;
  onEventLeave?: (eventId: string) => void;
  joinedEventIds?: string[];
}

export function EventList({
  filters,
  showCreateButton = false,
  onEventJoin,
  onEventLeave,
}: EventListProps) {
  const { data, isLoading, error } = useEvents(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load events. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const events = Array.isArray(data?.events) ? data.events : [];

  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium text-muted-foreground">
          No events found
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Try changing your filters or create a new event.
        </p>
        {showCreateButton ? (
          <Button render={<Link href="/events/create" />}>
            <Plus className="mr-2 h-4 w-4" />
            Create event
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onJoin={onEventJoin}
          onLeave={onEventLeave}
          showActions={!!onEventJoin || !!onEventLeave}
        />
      ))}
    </div>
  );
}
