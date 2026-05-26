import { axiosInstance } from "@/lib/http/axios";
import type {
  CreateEventCompetitionRequest,
  CreateEventPaymentMethodRequest,
  CreateEventPostRequest,
  CreateEventProgramItemRequest,
  CreateEventPrizeRequest,
  CreateEventRequest,
  CreateEventSponsorRequest,
  DuplicateEventRequest,
  Event,
  EventCompetition,
  EventFilters,
  EventJoinFormField,
  EventPass,
  EventParticipant,
  EventParticipantPayment,
  EventPost,
  EventProgramItem,
  EventPostReactionResponse,
  EventPrize,
  EventPaymentProofUrl,
  EventPaymentMethod,
  EventSponsor,
  JoinEventRequest,
  ReviewEventPaymentRequest,
  SubmitEventPaymentRequest,
  UpdateEventCompetitionRequest,
  UpdateEventJoinFormFieldsRequest,
  UpdateEventModulesRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventParticipantRoleRequest,
  UpdateEventPostRequest,
  UpdateEventPostSettingsRequest,
  UpdateEventProgramItemRequest,
  UpdateEventPrizeRequest,
  UpdateEventRequest,
  UpdateEventSponsorRequest,
} from "@freediving.ph/types";

export interface JoinEventMutationRequest extends JoinEventRequest {
  eventId: string;
}

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

type JoinFormFieldsPayload = {
  fields: EventJoinFormField[];
};

type EventPassPayload = EventPass;

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

type ListCompetitionsPayload = {
  competitions: EventCompetition[];
};

type CompetitionPayload = {
  competition: EventCompetition;
};

type ListPrizesPayload = {
  prizes: EventPrize[];
};

type PrizePayload = {
  prize: EventPrize;
};

type ListSponsorsPayload = {
  sponsors: EventSponsor[];
};

type SponsorPayload = {
  sponsor: EventSponsor;
};

type ListPostsPayload = {
  posts: EventPost[];
};

type PostPayload = {
  post: EventPost;
};

type ListProgramItemsPayload = {
  programItems: EventProgramItem[];
};

type ProgramItemPayload = {
  programItem: EventProgramItem;
};

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

  getMyEventPass: async (eventId: string): Promise<EventPass> => {
    const response = await axiosInstance.get<EventPassPayload>(
      `/v1/events/${eventId}/pass`,
    );
    return response.data;
  },

  verifyEventPass: async (slug: string, token: string): Promise<EventPass> => {
    const response = await axiosInstance.get<EventPassPayload>(
      `/v1/events/${encodeURIComponent(slug)}/pass/${encodeURIComponent(token)}`,
    );
    return response.data;
  },

  regenerateParticipantPass: async (
    eventId: string,
    participantId: string,
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.post<EventParticipant>(
      `/v1/events/${eventId}/participants/${participantId}/regenerate-pass`,
    );
    return response.data;
  },

  checkInEventPass: async (slug: string, token: string): Promise<EventPass> => {
    const response = await axiosInstance.post<EventPassPayload>(
      `/v1/events/${encodeURIComponent(slug)}/pass/${encodeURIComponent(token)}/check-in`,
      {},
    );
    return response.data;
  },

  getEventAttendees: async (
    eventId: string,
  ): Promise<ListParticipantsPayload> => {
    return eventsApi.getEventParticipants(eventId);
  },

  joinEvent: async (
    data: JoinEventMutationRequest,
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.post<JoinEventPayload>(
      `/v1/events/${data.eventId}/join`,
      {
        participantNote: data.participantNote ?? data.notes,
        joinAnswers: data.joinAnswers ?? {},
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

  updateEventModules: async (
    eventId: string,
    data: UpdateEventModulesRequest,
  ): Promise<Event> => {
    const response = await axiosInstance.patch<EventPayload>(
      `/v1/events/${eventId}/modules`,
      data,
    );
    return response.data.event;
  },

  getJoinFormFields: async (
    eventId: string,
  ): Promise<EventJoinFormField[]> => {
    const response = await axiosInstance.get<JoinFormFieldsPayload>(
      `/v1/events/${eventId}/join-form-fields`,
    );
    return response.data.fields ?? [];
  },

  updateJoinFormFields: async (
    eventId: string,
    data: UpdateEventJoinFormFieldsRequest,
  ): Promise<EventJoinFormField[]> => {
    const response = await axiosInstance.put<JoinFormFieldsPayload>(
      `/v1/events/${eventId}/join-form-fields`,
      data,
    );
    return response.data.fields ?? [];
  },

  duplicateEvent: async (
    eventId: string,
    data: DuplicateEventRequest,
  ): Promise<Event> => {
    const response = await axiosInstance.post<EventPayload>(
      `/v1/events/${eventId}/duplicate`,
      data,
    );
    return response.data.event;
  },

  getProgramItems: async (eventId: string): Promise<EventProgramItem[]> => {
    const response = await axiosInstance.get<ListProgramItemsPayload>(
      `/v1/events/${eventId}/program`,
    );
    return response.data.programItems ?? [];
  },

  createProgramItem: async (
    eventId: string,
    data: CreateEventProgramItemRequest,
  ): Promise<EventProgramItem> => {
    const response = await axiosInstance.post<ProgramItemPayload>(
      `/v1/events/${eventId}/program`,
      data,
    );
    return response.data.programItem;
  },

  updateProgramItem: async (
    eventId: string,
    programItemId: string,
    data: UpdateEventProgramItemRequest,
  ): Promise<EventProgramItem> => {
    const response = await axiosInstance.patch<ProgramItemPayload>(
      `/v1/events/${eventId}/program/${programItemId}`,
      data,
    );
    return response.data.programItem;
  },

  deleteProgramItem: async (
    eventId: string,
    programItemId: string,
  ): Promise<void> => {
    await axiosInstance.delete(`/v1/events/${eventId}/program/${programItemId}`);
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

  getPaymentMethods: async (eventId: string): Promise<EventPaymentMethod[]> => {
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

  getCompetitions: async (eventId: string): Promise<EventCompetition[]> => {
    const response = await axiosInstance.get<ListCompetitionsPayload>(
      `/v1/events/${eventId}/competitions`,
    );
    return response.data.competitions ?? [];
  },

  createCompetition: async (
    eventId: string,
    data: CreateEventCompetitionRequest,
  ): Promise<EventCompetition> => {
    const response = await axiosInstance.post<CompetitionPayload>(
      `/v1/events/${eventId}/competitions`,
      data,
    );
    return response.data.competition;
  },

  updateCompetition: async (
    eventId: string,
    competitionId: string,
    data: UpdateEventCompetitionRequest,
  ): Promise<EventCompetition> => {
    const response = await axiosInstance.patch<CompetitionPayload>(
      `/v1/events/${eventId}/competitions/${competitionId}`,
      data,
    );
    return response.data.competition;
  },

  deleteCompetition: async (
    eventId: string,
    competitionId: string,
  ): Promise<void> => {
    await axiosInstance.delete(
      `/v1/events/${eventId}/competitions/${competitionId}`,
    );
  },

  getPrizes: async (eventId: string): Promise<EventPrize[]> => {
    const response = await axiosInstance.get<ListPrizesPayload>(
      `/v1/events/${eventId}/prizes`,
    );
    return response.data.prizes ?? [];
  },

  createPrize: async (
    eventId: string,
    data: CreateEventPrizeRequest,
  ): Promise<EventPrize> => {
    const response = await axiosInstance.post<PrizePayload>(
      `/v1/events/${eventId}/prizes`,
      data,
    );
    return response.data.prize;
  },

  updatePrize: async (
    eventId: string,
    prizeId: string,
    data: UpdateEventPrizeRequest,
  ): Promise<EventPrize> => {
    const response = await axiosInstance.patch<PrizePayload>(
      `/v1/events/${eventId}/prizes/${prizeId}`,
      data,
    );
    return response.data.prize;
  },

  deletePrize: async (eventId: string, prizeId: string): Promise<void> => {
    await axiosInstance.delete(`/v1/events/${eventId}/prizes/${prizeId}`);
  },

  getSponsors: async (eventId: string): Promise<EventSponsor[]> => {
    const response = await axiosInstance.get<ListSponsorsPayload>(
      `/v1/events/${eventId}/sponsors`,
    );
    return response.data.sponsors ?? [];
  },

  createSponsor: async (
    eventId: string,
    data: CreateEventSponsorRequest,
  ): Promise<EventSponsor> => {
    const response = await axiosInstance.post<SponsorPayload>(
      `/v1/events/${eventId}/sponsors`,
      data,
    );
    return response.data.sponsor;
  },

  updateSponsor: async (
    eventId: string,
    sponsorId: string,
    data: UpdateEventSponsorRequest,
  ): Promise<EventSponsor> => {
    const response = await axiosInstance.patch<SponsorPayload>(
      `/v1/events/${eventId}/sponsors/${sponsorId}`,
      data,
    );
    return response.data.sponsor;
  },

  deleteSponsor: async (eventId: string, sponsorId: string): Promise<void> => {
    await axiosInstance.delete(`/v1/events/${eventId}/sponsors/${sponsorId}`);
  },

  getPosts: async (eventId: string): Promise<EventPost[]> => {
    const response = await axiosInstance.get<ListPostsPayload>(
      `/v1/events/${eventId}/posts`,
    );
    return response.data.posts ?? [];
  },

  createPost: async (
    eventId: string,
    data: CreateEventPostRequest,
  ): Promise<EventPost> => {
    const response = await axiosInstance.post<PostPayload>(
      `/v1/events/${eventId}/posts`,
      data,
    );
    return response.data.post;
  },

  updatePost: async (
    eventId: string,
    postId: string,
    data: UpdateEventPostRequest,
  ): Promise<EventPost> => {
    const response = await axiosInstance.patch<PostPayload>(
      `/v1/events/${eventId}/posts/${postId}`,
      data,
    );
    return response.data.post;
  },

  deletePost: async (eventId: string, postId: string): Promise<void> => {
    await axiosInstance.delete(`/v1/events/${eventId}/posts/${postId}`);
  },

  addPostFishReaction: async (
    eventId: string,
    postId: string,
  ): Promise<EventPostReactionResponse> => {
    const response = await axiosInstance.post<EventPostReactionResponse>(
      `/v1/events/${eventId}/updates/${postId}/reactions/fish`,
      {},
    );
    return response.data;
  },

  deletePostFishReaction: async (
    eventId: string,
    postId: string,
  ): Promise<EventPostReactionResponse> => {
    const response = await axiosInstance.delete<EventPostReactionResponse>(
      `/v1/events/${eventId}/updates/${postId}/reactions/fish`,
    );
    return response.data;
  },

  updatePostSettings: async (
    eventId: string,
    data: UpdateEventPostSettingsRequest,
  ): Promise<Event> => {
    const response = await axiosInstance.patch<EventPayload>(
      `/v1/events/${eventId}/post-settings`,
      data,
    );
    return response.data.event;
  },

  updateParticipantRole: async (
    eventId: string,
    participantId: string,
    data: UpdateEventParticipantRoleRequest,
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.patch<EventParticipant>(
      `/v1/events/${eventId}/participants/${participantId}/role`,
      data,
    );
    return response.data;
  },

  updateParticipantStatus: async (
    eventId: string,
    participantId: string,
    status: EventParticipant["status"],
  ): Promise<EventParticipant> => {
    const response = await axiosInstance.patch<EventParticipant>(
      `/v1/events/${eventId}/participants/${participantId}/status`,
      { status },
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
