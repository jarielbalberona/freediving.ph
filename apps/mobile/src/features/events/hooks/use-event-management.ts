import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventParticipant } from "@freediving.ph/types";

import {
  approveEventParticipant,
  checkInEventPass,
  getEventParticipants,
  getEventPaymentProofUrl,
  rejectEventParticipant,
  reviewEventPayment,
  updateEventParticipantStatus,
} from "@/features/events/api/events-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to manage this event.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to manage this event.", null);
    return token;
  };
};

const requireValue = (value: string, message: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new FphgoApiError(400, message, null);
  return trimmed;
};

export const useEventParticipantsQuery = (
  eventId: string | undefined,
  enabled: boolean,
) => {
  const getRequiredToken = useRequiredToken();

  return useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: async () => {
      const response = await getEventParticipants(
        requireValue(eventId ?? "", "Event unavailable."),
        await getRequiredToken(),
      );
      return response.participants ?? response.attendees ?? [];
    },
    queryKey: mobileQueryKeys.events.participants(eventId ?? ""),
    retry: false,
    staleTime: 30 * 1000,
  });
};

export const useEventParticipantActionMutation = (
  slug: string,
  eventId: string,
) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      action: "approve" | "reject" | "status";
      participantId: string;
      status?: Extract<EventParticipant["status"], "attended" | "cancelled" | "confirmed" | "no_show">;
    }) => {
      const token = await getRequiredToken();
      const id = requireValue(eventId, "Event unavailable.");
      const participantId = requireValue(payload.participantId, "Participant unavailable.");
      if (payload.action === "approve") {
        return approveEventParticipant(id, participantId, token);
      }
      if (payload.action === "reject") {
        return rejectEventParticipant(id, participantId, token);
      }
      if (!payload.status) {
        throw new FphgoApiError(400, "Choose a participant status.", null);
      }
      return updateEventParticipantStatus(id, participantId, payload.status, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.participants(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.lists() });
    },
  });
};

export const useEventPaymentReviewMutation = (
  slug: string,
  eventId: string,
) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      paymentId: string;
      reviewNotes?: string;
      status: "rejected" | "verified";
    }) => {
      const response = await reviewEventPayment(
        requireValue(eventId, "Event unavailable."),
        requireValue(payload.paymentId, "Payment unavailable."),
        payload.status,
        { reviewNotes: payload.reviewNotes?.trim() || undefined },
        await getRequiredToken(),
      );
      return response.payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.participants(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
    },
  });
};

export const useEventProofUrlMutation = (eventId: string) => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (paymentId: string) =>
      getEventPaymentProofUrl(
        requireValue(eventId, "Event unavailable."),
        requireValue(paymentId, "Payment unavailable."),
        await getRequiredToken(),
      ),
  });
};

export const useEventCheckInMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (token: string) =>
      checkInEventPass(
        requireValue(slug, "Event unavailable."),
        requireValue(token, "Enter a pass token."),
        await getRequiredToken(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.participants(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
    },
  });
};
