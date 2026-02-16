"use client";

import { useUser } from '@clerk/nextjs';
import { useEvents, useJoinEvent, useLeaveEvent } from '@/features/events';
import { EventList } from '@/features/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import { Calendar, Plus, Filter, Search } from 'lucide-react';
import { useState } from 'react';

export default function EventsPage() {
  const { user, isLoaded } = useUser();
  const [filters, setFilters] = useState({
    status: 'PUBLISHED' as const,
    page: 1,
    limit: 20
  });

  const { data: events, isLoading } = useEvents(filters);
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();

  const handleJoinEvent = (eventId: number) => {
    if (user?.id) {
      joinEventMutation.mutate({
        eventId,
        userId: parseInt(user.id)
      });
    }
  };

  const handleLeaveEvent = (eventId: number) => {
    if (user?.id) {
      leaveEventMutation.mutate({
        eventId,
        userId: parseInt(user.id)
      });
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Sign in to view events</h2>
          <p className="text-muted-foreground">
            Please sign in to see and join events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">
              Discover and join freediving events in your area.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Events List */}
        <FeatureErrorBoundary featureName="events">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <EventList
                filters={filters}
                onEventJoin={handleJoinEvent}
                onEventLeave={handleLeaveEvent}
                joinedEventIds={[]} // TODO: Get from user's joined events
              />
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      </div>
    </div>
  );
}

