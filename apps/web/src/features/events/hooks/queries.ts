import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import type { EventFilters } from '@freediving.ph/types';

export const useEvents = (filters?: EventFilters, enabled = true) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getEvents(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useEvent = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getEventById(eventId),
    enabled: enabled && !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEventAttendees = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: () => eventsApi.getEventAttendees(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};
