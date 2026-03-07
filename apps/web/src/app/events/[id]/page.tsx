"use client";

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEvent, useEventAttendees, useJoinEvent, useLeaveEvent } from '@/features/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/http/api-error';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const { data: attendeesData, isLoading: attendeesLoading, error: attendeesError } = useEventAttendees(eventId);
  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();

  if (eventLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-destructive">
            {getApiErrorMessage(eventError, 'Failed to load event details')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendees = attendeesData?.attendees ?? [];

  const handleJoin = () => {
    joinMutation.mutate(
      { eventId },
      {
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error('You do not have permission to join this event.');
            return;
          }
          toast.error(getApiErrorMessage(error, 'Failed to join event'));
        },
      },
    );
  };

  const handleLeave = () => {
    leaveMutation.mutate(
      { eventId },
      {
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error('You do not have permission to leave this event.');
            return;
          }
          toast.error(getApiErrorMessage(error, 'Failed to leave event'));
        },
      },
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        {event.viewerJoined ? (
          <Button variant="outline" onClick={handleLeave} disabled={leaveMutation.isPending}>
            Leave Event
          </Button>
        ) : (
          <Button onClick={handleJoin} disabled={joinMutation.isPending || event.status !== 'published'}>
            Join Event
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{event.status}</Badge>
            <Badge variant="outline">{event.visibility}</Badge>
            <Badge variant="outline">{event.type}</Badge>
            <Badge variant="outline">{event.difficulty}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description ? <p className="text-muted-foreground">{event.description}</p> : null}
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            {event.startsAt ? (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(event.startsAt).toLocaleString()}
              </div>
            ) : null}
            {event.location ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </div>
            ) : null}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.currentAttendees}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attendees
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          {attendeesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : attendeesError ? (
            <p className="text-destructive text-sm">{getApiErrorMessage(attendeesError, 'Failed to load attendees')}</p>
          ) : attendees.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attendees yet.</p>
          ) : (
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div key={attendee.userId} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{attendee.displayName || attendee.username || attendee.userId}</p>
                    <p className="text-xs text-muted-foreground">{attendee.username || attendee.userId}</p>
                  </div>
                  <Badge variant="outline">{attendee.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
