import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi, type JoinEventMutationRequest } from "../api/events";
import { trackProductEvent } from "@/lib/analytics/product-events";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateEventCompetitionRequest,
  CreateEventPaymentMethodRequest,
  CreateEventPostRequest,
  CreateEventProgramItemRequest,
  CreateEventPrizeRequest,
  CreateEventRequest,
  CreateEventSponsorRequest,
  DuplicateEventRequest,
  ReviewEventPaymentRequest,
  SubmitEventPaymentRequest,
  UpdateEventCompetitionRequest,
  UpdateEventJoinFormFieldsRequest,
  UpdateEventModulesRequest,
  UpdateEventParticipantRoleRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventPostRequest,
  UpdateEventPostSettingsRequest,
  UpdateEventProgramItemRequest,
  UpdateEventPrizeRequest,
  UpdateEventRequest,
  UpdateEventSponsorRequest,
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
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(response.slug),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useUpdateEventModules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateEventModulesRequest;
    }) => eventsApi.updateEventModules(eventId, data),
    onSuccess: (event, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(event.slug),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.program(variables.eventId),
      });
    },
  });
};

export const useUpdateEventJoinFormFields = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateEventJoinFormFieldsRequest;
    }) => eventsApi.updateJoinFormFields(eventId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.events.detail(variables.eventId),
          "join-form-fields",
        ],
      });
    },
  });
};

export const useDuplicateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: DuplicateEventRequest;
    }) => eventsApi.duplicateEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useCreateEventProgramItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventProgramItemRequest;
    }) => eventsApi.createProgramItem(eventId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.program(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
    },
  });
};

export const useUpdateEventProgramItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      programItemId,
      data,
    }: {
      eventId: string;
      programItemId: string;
      data: UpdateEventProgramItemRequest;
    }) => eventsApi.updateProgramItem(eventId, programItemId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.program(variables.eventId),
      });
    },
  });
};

export const useDeleteEventProgramItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      programItemId,
    }: {
      eventId: string;
      programItemId: string;
    }) => eventsApi.deleteProgramItem(eventId, programItemId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.program(variables.eventId),
      });
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

export const useUpdateEventPaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      paymentMethodId,
      data,
    }: {
      eventId: string;
      paymentMethodId: string;
      data: UpdateEventPaymentMethodRequest;
    }) => eventsApi.updatePaymentMethod(eventId, paymentMethodId, data),
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
    mutationFn: (data: JoinEventMutationRequest) => eventsApi.joinEvent(data),
    onSuccess: (_response, variables) => {
      trackProductEvent("event_joined");
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
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
      trackProductEvent("event_interested");
      queryClient.setQueryData(queryKeys.events.detail(event.slug), event);
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};

export const useUpdateEventParticipantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      participantId,
      status,
    }: {
      eventId: string;
      participantId: string;
      status: "confirmed" | "cancelled" | "attended" | "no_show";
    }) => eventsApi.updateParticipantStatus(eventId, participantId, status),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
      });
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
      });
    },
  });
};

export const useRegenerateEventPass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      participantId,
    }: {
      eventId: string;
      participantId: string;
    }) => eventsApi.regenerateParticipantPass(eventId, participantId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
      });
    },
  });
};

export const useCheckInEventPass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, token }: { slug: string; token: string }) =>
      eventsApi.checkInEventPass(slug, token),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        queryKeys.events.pass(variables.slug, variables.token),
        response,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participants(response.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.myPass(response.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(response.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.passVerifications(),
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

const invalidateEventManagement = (
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.competitions(eventId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.events.prizes(eventId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.sponsors(eventId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.events.posts(eventId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.participants(eventId),
  });
};

export const useCreateEventCompetition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventCompetitionRequest;
    }) => eventsApi.createCompetition(eventId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventCompetition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      competitionId,
      data,
    }: {
      eventId: string;
      competitionId: string;
      data: UpdateEventCompetitionRequest;
    }) => eventsApi.updateCompetition(eventId, competitionId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useDeleteEventCompetition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      competitionId,
    }: {
      eventId: string;
      competitionId: string;
    }) => eventsApi.deleteCompetition(eventId, competitionId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useCreateEventPrize = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventPrizeRequest;
    }) => eventsApi.createPrize(eventId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventPrize = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      prizeId,
      data,
    }: {
      eventId: string;
      prizeId: string;
      data: UpdateEventPrizeRequest;
    }) => eventsApi.updatePrize(eventId, prizeId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useDeleteEventPrize = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, prizeId }: { eventId: string; prizeId: string }) =>
      eventsApi.deletePrize(eventId, prizeId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useCreateEventSponsor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventSponsorRequest;
    }) => eventsApi.createSponsor(eventId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventSponsor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sponsorId,
      data,
    }: {
      eventId: string;
      sponsorId: string;
      data: UpdateEventSponsorRequest;
    }) => eventsApi.updateSponsor(eventId, sponsorId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useDeleteEventSponsor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sponsorId,
    }: {
      eventId: string;
      sponsorId: string;
    }) => eventsApi.deleteSponsor(eventId, sponsorId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useCreateEventPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: CreateEventPostRequest;
    }) => eventsApi.createPost(eventId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      postId,
      data,
    }: {
      eventId: string;
      postId: string;
      data: UpdateEventPostRequest;
    }) => eventsApi.updatePost(eventId, postId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useDeleteEventPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, postId }: { eventId: string; postId: string }) =>
      eventsApi.deletePost(eventId, postId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useAddEventPostFishReaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, postId }: { eventId: string; postId: string }) =>
      eventsApi.addPostFishReaction(eventId, postId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useDeleteEventPostFishReaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, postId }: { eventId: string; postId: string }) =>
      eventsApi.deletePostFishReaction(eventId, postId),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventPostSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateEventPostSettingsRequest;
    }) => eventsApi.updatePostSettings(eventId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};

export const useUpdateEventParticipantRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      participantId,
      data,
    }: {
      eventId: string;
      participantId: string;
      data: UpdateEventParticipantRoleRequest;
    }) => eventsApi.updateParticipantRole(eventId, participantId, data),
    onSuccess: (_response, variables) =>
      invalidateEventManagement(queryClient, variables.eventId),
  });
};
