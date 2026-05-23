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

export const useMyEventPass = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.myPass(eventId),
    queryFn: () => eventsApi.getMyEventPass(eventId),
    enabled: enabled && !!eventId,
    staleTime: 60 * 1000,
  });
};

export const useEventPassVerification = (
  slug: string,
  token: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: queryKeys.events.pass(slug, token),
    queryFn: () => eventsApi.verifyEventPass(slug, token),
    enabled: enabled && !!slug && !!token,
    staleTime: 30 * 1000,
    retry: false,
  });
};

export const useEventPaymentMethods = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.paymentMethods(eventId),
    queryFn: () => eventsApi.getPaymentMethods(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventCompetitions = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.competitions(eventId),
    queryFn: () => eventsApi.getCompetitions(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventProgramItems = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.program(eventId),
    queryFn: () => eventsApi.getProgramItems(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventPrizes = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.prizes(eventId),
    queryFn: () => eventsApi.getPrizes(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventSponsors = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.sponsors(eventId),
    queryFn: () => eventsApi.getSponsors(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventPosts = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.posts(eventId),
    queryFn: () => eventsApi.getPosts(eventId),
    enabled: enabled && !!eventId,
    staleTime: 60 * 1000,
  });
};

export const useEventJoinFormFields = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: [...queryKeys.events.detail(eventId), "join-form-fields"],
    queryFn: () => eventsApi.getJoinFormFields(eventId),
    enabled: enabled && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};
