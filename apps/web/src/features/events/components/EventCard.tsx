"use client";

import { Event } from '@freediving.ph/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  isJoined?: boolean;
  showActions?: boolean;
}

export function EventCard({
  event,
  onJoin,
  onLeave,
  isJoined = false,
  showActions = true,
}: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Time';
    return format(date, 'HH:mm');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle>
              <Link href={`/events/${event.id}`} className="hover:underline">
                {event.title}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusColor(event.status)}>{event.status}</Badge>
              <Badge variant="outline">{event.type}</Badge>
              <Badge variant="outline">{event.difficulty}</Badge>
              <Badge variant="outline">{event.visibility}</Badge>
            </div>
          </div>
          {showActions ? (
            <div className="flex gap-2">
              {isJoined ? (
                <Button size="sm" variant="outline" onClick={() => onLeave?.(event.id)}>
                  Leave
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onJoin?.(event.id)}
                  disabled={event.status !== 'published'}
                >
                  Join
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {event.description ? (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{event.description}</p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.startsAt)}</span>
            {event.startsAt && event.endsAt ? (
              <>
                <Clock className="h-4 w-4 ml-2" />
                <span>
                  {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
                </span>
              </>
            ) : null}
          </div>

          {event.location ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {event.currentAttendees}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attendees
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
