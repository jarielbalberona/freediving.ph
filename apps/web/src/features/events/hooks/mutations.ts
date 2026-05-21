import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "../api/events";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest,
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

export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinEventRequest) => eventsApi.joinEvent(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(variables.eventId),
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
        queryKey: queryKeys.events.attendees(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
    },
  });
};
