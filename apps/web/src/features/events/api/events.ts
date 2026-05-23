import { axiosInstance } from "@/lib/http/axios";
import type {
  CreateEventPaymentMethodRequest,
  CreateEventRequest,
  Event,
  EventFilters,
  EventParticipant,
  EventParticipantPayment,
  EventPaymentProofUrl,
  EventPaymentMethod,
  JoinEventRequest,
  ReviewEventPaymentRequest,
  SubmitEventPaymentRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventRequest,
} from "@freediving.ph/types";

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

type ListParticipantsPayload = {
  participants?: EventParticipant[];
  attendees?: EventParticipant[];
  pagination: Pagination;
};

type JoinEventPayload = {
  participant?: EventParticipant;
  attendee?: EventParticipant;
};

type ListPaymentMethodsPayload = {
  paymentMethods: EventPaymentMethod[];
};

type PaymentMethodPayload = {
  paymentMethod: EventPaymentMethod;
};

type PaymentPayload = {
  payment: EventParticipantPayment;
};

type PaymentProofUrlPayload = EventPaymentProofUrl;

export const eventsApi = {
  getEvents: async (filters?: EventFilters): Promise<ListEventsPayload> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.groupId) params.append("groupId", filters.groupId);
    if (filters?.diveSiteId) params.append("diveSiteId", filters.diveSiteId);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.difficulty) params.append("difficulty", filters.difficulty);
    if (typeof filters?.beginnerFriendly === "boolean") {
      params.append("beginnerFriendly", String(filters.beginnerFriendly));
    }
    if (filters?.price) params.append("price", filters.price);

    const queryString = params.toString();
    const url = `/v1/events${queryString ? `?${queryString}` : ""}`;

    const response = await axiosInstance.get<ListEventsPayload>(url);
    return response.data;
  },

  getEventBySlug: async (slug: string): Promise<Event> => {
    const response = await axiosInstance.get<EventPayload>(
      `/v1/events/${encodeURIComponent(slug)}`,
    );
    return response.data.event;
  },

  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    const response = await axiosInstance.post<EventPayload>("/v1/events", data);
    return response.data.event;
  },

  updateEvent: async (
    eventId: string,
    data: UpdateEventRequest,
  ): Promise<Event> => {
    const response = await axiosInstance.patch<EventPayload>(
      `/v1/events/${eventId}`,
      data,
    );
    return response.data.event;
  },

  getEventParticipants: async (
    eventId: string,
  ): Promise<ListParticipantsPayload> => {
    const response = await axiosInstance.get<ListParticipantsPayload>(
      `/v1/events/${eventId}/participants`,
    );
    return response.data;
  },

  getEventAttendees: async (
    eventId: string,
  ): Promise<ListParticipantsPayload> => {
    return eventsApi.getEventParticipants(eventId);
  },

  joinEvent: async (data: JoinEventRequest): Promise<EventParticipant> => {
    const response = await axiosInstance.post<JoinEventPayload>(
      `/v1/events/${data.eventId}/join`,
      {
        participantNote: data.participantNote ?? data.notes,
      },
    );
    const participant = response.data.participant ?? response.data.attendee;
    if (!participant) {
      throw new Error("Join response did not include a participant");
    }
    return participant;
  },

  leaveEvent: async (eventId: string): Promise<void> => {
    await axiosInstance.post(`/v1/events/${eventId}/leave`);
  },

  markEventInterested: async (eventId: string): Promise<Event> => {
    const response = await axiosInstance.put<EventPayload>(
      `/v1/events/${eventId}/interest`,
    );
    return response.data.event;
  },

  markEventUninterested: async (eventId: string): Promise<Event> => {
    const response = await axiosInstance.delete<EventPayload>(
      `/v1/events/${eventId}/interest`,
    );
    return response.data.event;
  },

  getPaymentMethods: async (
    eventId: string,
  ): Promise<EventPaymentMethod[]> => {
    const response = await axiosInstance.get<ListPaymentMethodsPayload>(
      `/v1/events/${eventId}/payment-methods`,
    );
    return response.data.paymentMethods;
  },

  createPaymentMethod: async (
    eventId: string,
    data: CreateEventPaymentMethodRequest,
  ): Promise<EventPaymentMethod> => {
    const response = await axiosInstance.post<PaymentMethodPayload>(
      `/v1/events/${eventId}/payment-methods`,
      data,
    );
    return response.data.paymentMethod;
  },

  updatePaymentMethod: async (
    eventId: string,
    paymentMethodId: string,
    data: UpdateEventPaymentMethodRequest,
  ): Promise<EventPaymentMethod> => {
    const response = await axiosInstance.patch<PaymentMethodPayload>(
      `/v1/events/${eventId}/payment-methods/${paymentMethodId}`,
      data,
    );
    return response.data.paymentMethod;
  },

  submitPayment: async (
    data: SubmitEventPaymentRequest,
  ): Promise<EventParticipantPayment> => {
    const response = await axiosInstance.post<PaymentPayload>(
      `/v1/events/${data.eventId}/payments`,
      {
        paymentMethodId: data.paymentMethodId,
        proofMediaId: data.proofMediaId,
        referenceNumber: data.referenceNumber,
      },
    );
    return response.data.payment;
  },

  verifyPayment: async (
    eventId: string,
    paymentId: string,
    data: ReviewEventPaymentRequest = {},
  ): Promise<EventParticipantPayment> => {
    const response = await axiosInstance.patch<PaymentPayload>(
      `/v1/events/${eventId}/payments/${paymentId}/verify`,
      data,
    );
    return response.data.payment;
  },

  rejectPayment: async (
    eventId: string,
    paymentId: string,
    data: ReviewEventPaymentRequest = {},
  ): Promise<EventParticipantPayment> => {
    const response = await axiosInstance.patch<PaymentPayload>(
      `/v1/events/${eventId}/payments/${paymentId}/reject`,
      data,
    );
    return response.data.payment;
  },

  getPaymentProofUrl: async (
    eventId: string,
    paymentId: string,
  ): Promise<EventPaymentProofUrl> => {
    const response = await axiosInstance.get<PaymentProofUrlPayload>(
      `/v1/events/${eventId}/payments/${paymentId}/proof-url`,
    );
    return response.data;
  },

  approveParticipant: async (
    eventId: string,
    participantId: string,
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.patch<EventParticipant>(
      `/v1/events/${eventId}/participants/${participantId}/approve`,
    );
    return response.data;
  },

  rejectParticipant: async (
    eventId: string,
    participantId: string,
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.patch<EventParticipant>(
      `/v1/events/${eventId}/participants/${participantId}/reject`,
    );
    return response.data;
  },
};
