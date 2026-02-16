import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  Event,
  EventAttendee,
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest,
  EventFilters
} from '../types';

export const eventsApi = {
  getEvents: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.organizerId) params.append('organizerId', filters.organizerId.toString());
    if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());

    const queryString = params.toString();
    const url = `/events${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ApiEnvelope<Event[]>>(url);
    return response.data.data;
  },

  // Get event by ID
  getEventById: async (eventId: number): Promise<Event> => {
    const response = await axiosInstance.get<ApiEnvelope<Event>>(`/events/${eventId}`);
    return response.data.data;
  },

  // Create new event
  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    const response = await axiosInstance.post<ApiEnvelope<Event>>('/events', data);
    return response.data.data;
  },

  // Update event
  updateEvent: async (eventId: number, data: UpdateEventRequest): Promise<Event> => {
    const response = await axiosInstance.put<ApiEnvelope<Event>>(`/events/${eventId}`, data);
    return response.data.data;
  },

  // Get event attendees
  getEventAttendees: async (eventId: number): Promise<EventAttendee[]> => {
    const response = await axiosInstance.get<ApiEnvelope<EventAttendee[]>>(`/events/${eventId}/attendees`);
    return response.data.data;
  },

  // Join event
  joinEvent: async (data: JoinEventRequest): Promise<EventAttendee> => {
    const response = await axiosInstance.post<ApiEnvelope<EventAttendee>>(`/events/${data.eventId}/attendees`, {
      userId: data.userId,
      notes: data.notes
    });
    return response.data.data;
  },

  // Leave event
  leaveEvent: async (eventId: number, userId: number): Promise<void> => {
    await axiosInstance.delete(`/events/${eventId}/attendees/${userId}`);
  },
};
