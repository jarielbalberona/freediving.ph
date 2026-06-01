import type {
  CreateEventPostRequest,
  EventCompetition,
  EventDetailResponse,
  EventFilters,
  EventJoinFormField,
  EventListResponse,
  EventParticipant,
  EventParticipantPayment,
  EventPaymentProofUrl,
  EventPass,
  EventPaymentMethod,
  EventPostResponse,
  EventPostReactionResponse,
  EventPostsResponse,
  EventPrize,
  EventProgramItem,
  EventSponsor,
  JoinEventResponse,
  JoinEventRequest,
  ReviewEventPaymentRequest,
  SubmitEventPaymentRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getEvents = (filters: EventFilters = {}) =>
  fphgoFetch<EventListResponse>(
    withQuery("/v1/events", {
      beginnerFriendly: filters.beginnerFriendly,
      difficulty: filters.difficulty,
      diveSiteId: filters.diveSiteId,
      groupId: filters.groupId,
      limit: filters.limit,
      page: filters.page,
      price: filters.price,
      search: filters.search,
      status: filters.status,
      type: filters.type,
    }),
    { auth: "optional" },
  );

export const getEventDetail = (slug: string) =>
  fphgoFetch<EventDetailResponse>(
    `/v1/events/${encodeURIComponent(slug)}`,
    { auth: "optional" },
  );

export const joinEvent = (eventId: string, authToken: string) =>
  fphgoFetch<JoinEventResponse>(`/v1/events/${encodeURIComponent(eventId)}/join`, {
    auth: "required",
    authToken,
    body: { joinAnswers: {} } satisfies JoinEventRequest,
    method: "POST",
  });

export const joinEventWithAnswers = (
  eventId: string,
  payload: JoinEventRequest,
  authToken: string,
) =>
  fphgoFetch<JoinEventResponse>(`/v1/events/${encodeURIComponent(eventId)}/join`, {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const leaveEvent = (eventId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/events/${encodeURIComponent(eventId)}/leave`, {
    auth: "required",
    authToken,
    method: "POST",
  });

export const setEventInterest = (eventId: string, authToken: string) =>
  fphgoFetch<EventDetailResponse>(`/v1/events/${encodeURIComponent(eventId)}/interest`, {
    auth: "required",
    authToken,
    method: "PUT",
  });

export const removeEventInterest = (eventId: string, authToken: string) =>
  fphgoFetch<EventDetailResponse>(`/v1/events/${encodeURIComponent(eventId)}/interest`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const getEventPosts = (eventId: string) =>
  fphgoFetch<EventPostsResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/posts`,
    { auth: "optional" },
  );

export const getEventJoinFormFields = (eventId: string) =>
  fphgoFetch<{ fields: EventJoinFormField[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/join-form-fields`,
    { auth: "optional" },
  );

export const getMyEventPass = (eventId: string, authToken: string) =>
  fphgoFetch<EventPass>(`/v1/events/${encodeURIComponent(eventId)}/pass`, {
    auth: "required",
    authToken,
  });

export const verifyEventPass = (slug: string, token: string) =>
  fphgoFetch<EventPass>(
    `/v1/events/${encodeURIComponent(slug)}/pass/${encodeURIComponent(token)}`,
    { auth: "optional" },
  );

export const getEventPaymentMethods = (eventId: string, authToken: string) =>
  fphgoFetch<{ paymentMethods: EventPaymentMethod[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/payment-methods`,
    { auth: "required", authToken },
  );

export const getEventParticipants = (eventId: string, authToken: string) =>
  fphgoFetch<{
    attendees?: EventParticipant[];
    pagination?: {
      hasNext?: boolean;
      hasPrev?: boolean;
      limit: number;
      page: number;
      total: number;
      totalPages: number;
    };
    participants?: EventParticipant[];
  }>(`/v1/events/${encodeURIComponent(eventId)}/participants?limit=100`, {
    auth: "required",
    authToken,
  });

export const submitEventPayment = (
  payload: SubmitEventPaymentRequest,
  authToken: string,
) =>
  fphgoFetch<{ payment: EventParticipantPayment }>(
    `/v1/events/${encodeURIComponent(payload.eventId)}/payments`,
    {
      auth: "required",
      authToken,
      body: {
        paymentMethodId: payload.paymentMethodId,
        proofMediaId: payload.proofMediaId,
        referenceNumber: payload.referenceNumber,
      },
      method: "POST",
    },
  );

export const getEventPaymentProofUrl = (
  eventId: string,
  paymentId: string,
  authToken: string,
) =>
  fphgoFetch<EventPaymentProofUrl>(
    `/v1/events/${encodeURIComponent(eventId)}/payments/${encodeURIComponent(paymentId)}/proof-url`,
    { auth: "required", authToken },
  );

export const reviewEventPayment = (
  eventId: string,
  paymentId: string,
  status: "rejected" | "verified",
  payload: ReviewEventPaymentRequest,
  authToken: string,
) =>
  fphgoFetch<{ payment: EventParticipantPayment }>(
    `/v1/events/${encodeURIComponent(eventId)}/payments/${encodeURIComponent(paymentId)}/${status === "verified" ? "verify" : "reject"}`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );

export const approveEventParticipant = (
  eventId: string,
  participantId: string,
  authToken: string,
) =>
  fphgoFetch<EventParticipant>(
    `/v1/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}/approve`,
    { auth: "required", authToken, method: "PATCH" },
  );

export const rejectEventParticipant = (
  eventId: string,
  participantId: string,
  authToken: string,
) =>
  fphgoFetch<EventParticipant>(
    `/v1/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}/reject`,
    { auth: "required", authToken, method: "PATCH" },
  );

export const updateEventParticipantStatus = (
  eventId: string,
  participantId: string,
  status: Extract<EventParticipant["status"], "attended" | "cancelled" | "confirmed" | "no_show">,
  authToken: string,
) =>
  fphgoFetch<EventParticipant>(
    `/v1/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}/status`,
    {
      auth: "required",
      authToken,
      body: { status },
      method: "PATCH",
    },
  );

export const checkInEventPass = (
  slug: string,
  token: string,
  authToken: string,
) =>
  fphgoFetch<EventPass>(
    `/v1/events/${encodeURIComponent(slug)}/pass/${encodeURIComponent(token)}/check-in`,
    { auth: "required", authToken, method: "POST" },
  );

export const getEventProgramItems = (eventId: string) =>
  fphgoFetch<{ programItems: EventProgramItem[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/program`,
    { auth: "optional" },
  );

export const getEventCompetitions = (eventId: string) =>
  fphgoFetch<{ competitions: EventCompetition[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/competitions`,
    { auth: "optional" },
  );

export const getEventPrizes = (eventId: string) =>
  fphgoFetch<{ prizes: EventPrize[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/prizes`,
    { auth: "optional" },
  );

export const getEventSponsors = (eventId: string) =>
  fphgoFetch<{ sponsors: EventSponsor[] }>(
    `/v1/events/${encodeURIComponent(eventId)}/sponsors`,
    { auth: "optional" },
  );

export const createEventPost = (
  eventId: string,
  payload: CreateEventPostRequest,
  authToken: string,
) =>
  fphgoFetch<EventPostResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/posts`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const setEventPostFish = (
  eventId: string,
  postId: string,
  authToken: string,
) =>
  fphgoFetch<EventPostReactionResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/updates/${encodeURIComponent(postId)}/reactions/fish`,
    { auth: "required", authToken, method: "POST" },
  );

export const removeEventPostFish = (
  eventId: string,
  postId: string,
  authToken: string,
) =>
  fphgoFetch<EventPostReactionResponse>(
    `/v1/events/${encodeURIComponent(eventId)}/updates/${encodeURIComponent(postId)}/reactions/fish`,
    { auth: "required", authToken, method: "DELETE" },
  );
