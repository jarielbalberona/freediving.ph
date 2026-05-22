import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "../api/events";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateEventPaymentMethodRequest,
  CreateEventRequest,
  ReviewEventPaymentRequest,
  SubmitEventPaymentRequest,
  JoinEventRequest,
  UpdateEventRequest,
} from "@freediving.ph/types";

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: { eventId: string; data: UpdateEventRequest }) =>
      eventsApi.updateEvent(eventId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useCreateEventPaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventPaymentMethodRequest;
    }) => eventsApi.createPaymentMethod(eventId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.paymentMethods(variables.eventId),
      });
    },
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinEventRequest) => eventsApi.joinEvent(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) =>
      eventsApi.leaveEvent(eventId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useMarkEventInterested = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) =>
      eventsApi.markEventInterested(eventId),
    onSuccess: (event, variables) => {
      queryClient.setQueryData(queryKeys.events.detail(event.slug), event);
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(event.slug),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useMarkEventUninterested = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) =>
      eventsApi.markEventUninterested(eventId),
    onSuccess: (event, variables) => {
      queryClient.setQueryData(queryKeys.events.detail(event.slug), event);
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(event.slug),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useApproveEventParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      participantId,
    }: { eventId: string; participantId: string }) =>
      eventsApi.approveParticipant(eventId, participantId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useRejectEventParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      participantId,
    }: { eventId: string; participantId: string }) =>
      eventsApi.rejectParticipant(eventId, participantId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useSubmitEventPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitEventPaymentRequest) =>
      eventsApi.submitPayment(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
    },
  });
};

export const useVerifyEventPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      paymentId,
      data,
    }: {
      eventId: string;
      paymentId: string;
      data?: ReviewEventPaymentRequest;
    }) => eventsApi.verifyPayment(eventId, paymentId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
    },
  });
};

export const useRejectEventPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      paymentId,
      data,
    }: {
      eventId: string;
      paymentId: string;
      data?: ReviewEventPaymentRequest;
    }) => eventsApi.rejectPayment(eventId, paymentId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
    },
  });
};

export const useEventPaymentProofUrl = () =>
  useMutation({
    mutationFn: ({
      eventId,
      paymentId,
    }: {
      eventId: string;
      paymentId: string;
    }) => eventsApi.getPaymentProofUrl(eventId, paymentId),
  });
