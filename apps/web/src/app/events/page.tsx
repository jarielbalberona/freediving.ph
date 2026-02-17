"use client";

import { useUser } from '@clerk/nextjs';
import { EventList } from '@/features/events';
import { useJoinEvent, useLeaveEvent } from '@/features/events';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Plus, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/http/api-error';
import { getNumericUserId } from '@/lib/auth/user-id';

export default function EventsPage() {
  const { user } = useUser();
  const filters = {
    status: 'PUBLISHED' as const,
    page: 1,
    limit: 20
  };

  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const numericUserId = getNumericUserId(user);

  const handleJoinEvent = (eventId: number) => {
    if (!numericUserId) {
      toast.error("Account setup incomplete. Please refresh and try again.");
      return;
    }

    joinEventMutation.mutate(
      { eventId, userId: numericUserId },
      {
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error("You do not have permission to join this event.");
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to join event"));
        },
      },
    );
  };

  const handleLeaveEvent = (eventId: number) => {
    if (!numericUserId) {
      toast.error("Account setup incomplete. Please refresh and try again.");
      return;
    }

    leaveEventMutation.mutate(
      { eventId, userId: numericUserId },
      {
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
  }

  return (
    <AuthGuard title="Sign in to view events" description="Please sign in to see and join events.">
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
            <div className="px-6 pb-6">
              <EventList
                filters={filters}
                onEventJoin={handleJoinEvent}
                onEventLeave={handleLeaveEvent}
                joinedEventIds={[]} // TODO: Get from user's joined events
              />
            </div>
          </Card>
        </FeatureErrorBoundary>
      </div>
      </div>
    </AuthGuard>
  );
}
