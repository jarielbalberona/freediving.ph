"use client";

import { Event } from '@freediving.ph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
  onJoin?: (eventId: number) => void;
  onLeave?: (eventId: number) => void;
  isJoined?: boolean;
  showActions?: boolean;
}

export function EventCard({
  event,
  onJoin,
  onLeave,
  isJoined = false,
  showActions = true
}: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      case 'COMPLETED':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WORKSHOP':
        return 'default';
      case 'COMPETITION':
        return 'destructive';
      case 'SOCIAL':
        return 'secondary';
      case 'TRAINING':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-success/15 text-success-foreground';
      case 'INTERMEDIATE':
        return 'bg-info/15 text-info-foreground';
      case 'ADVANCED':
        return 'bg-warning/15 text-warning-foreground';
      case 'EXPERT':
        return 'bg-destructive/15 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    return format(date, 'HH:mm');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle>{event.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusColor(event.status)}>
                {event.status}
              </Badge>
              <Badge variant={getTypeColor(event.type)}>
                {event.type}
              </Badge>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(event.difficulty)}`}>
                {event.difficulty}
              </span>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              {isJoined ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLeave?.(event.id)}
                >
                  Leave
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onJoin?.(event.id)}
                  disabled={event.status !== 'PUBLISHED'}
                >
                  Join
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {event.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {event.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.startDate)}</span>
            {event.startDate && event.endDate && (
              <>
                <Clock className="h-4 w-4 ml-2" />
                <span>{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {event.currentAttendees}
              {event.maxAttendees && ` / ${event.maxAttendees}`} attendees
            </span>
          </div>

          {event.price && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{event.price} {event.currency || 'USD'}</span>
            </div>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {event.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline">
                +{event.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
