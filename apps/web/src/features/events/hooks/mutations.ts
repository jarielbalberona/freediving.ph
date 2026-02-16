import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import type {
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest
} from '@freediving.ph/types';

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventRequest) =>
      eventsApi.createEvent(data),
    onSuccess: (response, variables) => {
      // Invalidate events list
      queryClient.invalidateQueries({
        queryKey: ['events']
      });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: number; data: UpdateEventRequest }) =>
      eventsApi.updateEvent(eventId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific event
      queryClient.invalidateQueries({
        queryKey: ['event', variables.eventId]
      });
      // Invalidate events list
      queryClient.invalidateQueries({
        queryKey: ['events']
      });
    },
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinEventRequest) =>
      eventsApi.joinEvent(data),
    onSuccess: (response, variables) => {
      // Invalidate event attendees
      queryClient.invalidateQueries({
        queryKey: ['event-attendees', variables.eventId]
      });
      // Invalidate specific event
      queryClient.invalidateQueries({
        queryKey: ['event', variables.eventId]
      });
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: number; userId: number }) =>
      eventsApi.leaveEvent(eventId, userId),
    onSuccess: (response, variables) => {
      // Invalidate event attendees
      queryClient.invalidateQueries({
        queryKey: ['event-attendees', variables.eventId]
      });
      // Invalidate specific event
      queryClient.invalidateQueries({
        queryKey: ['event', variables.eventId]
      });
    },
  });
};
