import { axiosInstance } from '@/lib/http/axios';
import type {
  Event,
  EventAttendee,
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest,
  EventFilters,
} from '@freediving.ph/types';

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ListEventsPayload = {
  events: Event[];
  pagination: Pagination;
};

type EventPayload = {
  event: Event;
};

type ListAttendeesPayload = {
  attendees: EventAttendee[];
  pagination: Pagination;
};

type JoinEventPayload = {
  attendee: EventAttendee;
};

export const eventsApi = {
  getEvents: async (filters?: EventFilters): Promise<ListEventsPayload> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.groupId) params.append('groupId', filters.groupId);

    const queryString = params.toString();
    const url = `/v1/events${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ListEventsPayload>(url);
    return response.data;
  },

  getEventById: async (eventId: string): Promise<Event> => {
    const response = await axiosInstance.get<EventPayload>(`/v1/events/${eventId}`);
    return response.data.event;
  },

  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    const response = await axiosInstance.post<EventPayload>('/v1/events', data);
    return response.data.event;
  },

  updateEvent: async (eventId: string, data: UpdateEventRequest): Promise<Event> => {
    const response = await axiosInstance.patch<EventPayload>(`/v1/events/${eventId}`, data);
    return response.data.event;
  },

  getEventAttendees: async (eventId: string): Promise<ListAttendeesPayload> => {
    const response = await axiosInstance.get<ListAttendeesPayload>(`/v1/events/${eventId}/attendees`);
    return response.data;
  },

  joinEvent: async (data: JoinEventRequest): Promise<EventAttendee> => {
    const response = await axiosInstance.post<JoinEventPayload>(`/v1/events/${data.eventId}/join`, {
      notes: data.notes,
    });
    return response.data.attendee;
  },

  leaveEvent: async (eventId: string): Promise<void> => {
    await axiosInstance.post(`/v1/events/${eventId}/leave`);
  },
};
