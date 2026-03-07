import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import type {
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest,
} from '@freediving.ph/types';

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventRequest }) =>
      eventsApi.updateEvent(eventId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinEventRequest) => eventsApi.joinEvent(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => eventsApi.leaveEvent(eventId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};
