import { axiosInstance } from '@/lib/http/axios';
import type {
  Event,
  EventAttendee,
  CreateEventRequest,
  UpdateEventRequest,
  JoinEventRequest,
  EventFilters
} from '../types';

export const eventsApi = {
  // Get all events with pagination and filtering
  getEvents: (filters?: EventFilters) => {
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

    return axiosInstance.get<{
      success: boolean;
      data: {
        events: Event[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Get event by ID
  getEventById: (eventId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: Event;
    }>(`/events/${eventId}`);
  },

  // Create new event
  createEvent: (data: CreateEventRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: Event;
    }>('/events', data);
  },

  // Update event
  updateEvent: (eventId: number, data: UpdateEventRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: Event;
    }>(`/events/${eventId}`, data);
  },

  // Get event attendees
  getEventAttendees: (eventId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: EventAttendee[];
    }>(`/events/${eventId}/attendees`);
  },

  // Join event
  joinEvent: (data: JoinEventRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: EventAttendee;
    }>(`/events/${data.eventId}/attendees`, {
      userId: data.userId,
      notes: data.notes
    });
  },

  // Leave event
  leaveEvent: (eventId: number, userId: number) => {
    return axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/events/${eventId}/attendees/${userId}`);
  },
};
