import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../api/events";
import type { EventFilters } from "@freediving.ph/types";
import { queryKeys } from "@/lib/query/query-keys";

export const useEvents = (filters?: EventFilters, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => eventsApi.getEvents(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useEvent = (slug: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.detail(slug),
    queryFn: () => eventsApi.getEventBySlug(slug),
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEventAttendees = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.participants(eventId),
    queryFn: () => eventsApi.getEventParticipants(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventParticipants = useEventAttendees;

export const useEventPaymentMethods = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.paymentMethods(eventId),
    queryFn: () => eventsApi.getPaymentMethods(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};
