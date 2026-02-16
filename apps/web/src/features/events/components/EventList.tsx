"use client";

import { useEvents } from '../hooks';
import { EventCard } from './EventCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Plus } from 'lucide-react';
import { useState } from 'react';
import type { EventFilters } from '@freediving.ph/types';

interface EventListProps {
  filters?: EventFilters;
  showCreateButton?: boolean;
  onEventJoin?: (eventId: number) => void;
  onEventLeave?: (eventId: number) => void;
  joinedEventIds?: number[];
}

export function EventList({
  filters,
  showCreateButton = false,
  onEventJoin,
  onEventLeave,
  joinedEventIds = []
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

  const events = Array.isArray(data) ? data : [];

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No events found
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {filters?.search ? 'Try adjusting your search criteria.' : 'No events are currently available.'}
        </p>
        {showCreateButton && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        )}
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
          isJoined={joinedEventIds.includes(event.id)}
          showActions={!!onEventJoin || !!onEventLeave}
        />
      ))}
    </div>
  );
}
