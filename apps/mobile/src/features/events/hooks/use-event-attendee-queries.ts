import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import {
  getEventCompetitions,
  getEventJoinFormFields,
  getEventPaymentMethods,
  getEventPrizes,
  getEventProgramItems,
  getEventSponsors,
  getMyEventPass,
  verifyEventPass,
} from "@/features/events/api/events-api";
import { mobileQueryKeys } from "@/lib/query";

export const useEventJoinFormFieldsQuery = (
  eventId: string | undefined,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const response = await getEventJoinFormFields(eventId ?? "");
      return response.fields ?? [];
    },
    queryKey: mobileQueryKeys.events.joinFormFields(eventId ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useMyEventPassQuery = (
  eventId: string | undefined,
  enabled = true,
) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    enabled: enabled && Boolean(eventId) && isLoaded && Boolean(isSignedIn),
    queryFn: async () => getMyEventPass(eventId ?? "", (await getToken()) ?? ""),
    queryKey: mobileQueryKeys.events.myPass(eventId ?? ""),
    retry: false,
    staleTime: 60 * 1000,
  });
};

export const useEventPassVerificationQuery = (
  slug: string | undefined,
  token: string | undefined,
) =>
  useQuery({
    enabled: Boolean(slug) && Boolean(token),
    queryFn: () => verifyEventPass(slug ?? "", token ?? ""),
    queryKey: mobileQueryKeys.events.pass(slug ?? "", token ?? ""),
    retry: false,
    staleTime: 30 * 1000,
  });

export const useEventPaymentMethodsQuery = (
  eventId: string | undefined,
  enabled = true,
) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    enabled: enabled && Boolean(eventId) && isLoaded && Boolean(isSignedIn),
    queryFn: async () => {
      const response = await getEventPaymentMethods(
        eventId ?? "",
        (await getToken()) ?? "",
      );
      return response.paymentMethods ?? [];
    },
    queryKey: mobileQueryKeys.events.paymentMethods(eventId ?? ""),
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEventProgramItemsQuery = (
  eventId: string | undefined,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const response = await getEventProgramItems(eventId ?? "");
      return response.programItems ?? [];
    },
    queryKey: mobileQueryKeys.events.program(eventId ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useEventPrizesQuery = (
  eventId: string | undefined,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const [competitions, prizes] = await Promise.all([
        getEventCompetitions(eventId ?? ""),
        getEventPrizes(eventId ?? ""),
      ]);
      return {
        competitions: competitions.competitions ?? [],
        prizes: prizes.prizes ?? [],
      };
    },
    queryKey: mobileQueryKeys.events.prizes(eventId ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useEventSponsorsQuery = (
  eventId: string | undefined,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const response = await getEventSponsors(eventId ?? "");
      return response.sponsors ?? [];
    },
    queryKey: mobileQueryKeys.events.sponsors(eventId ?? ""),
    staleTime: 2 * 60 * 1000,
  });
