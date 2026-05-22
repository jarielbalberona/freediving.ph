import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateEventRequest,
  Event,
  EventFilters,
  EventParticipant,
  EventParticipantPayment,
  EventPaymentMethod,
  EventPaymentProofUrl,
  EventViewerEventState,
  JoinEventRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventRequest,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type BackendEventType =
  | "intro_session"
  | "pool_training"
  | "line_training"
  | "fun_dive"
  | "depth_training"
  | "certification_course"
  | "workshop"
  | "competition"
  | "cleanup_dive"
  | "trip_retreat";

type BackendEventStatus = "draft" | "published" | "cancelled" | "completed";
type BackendEventVisibility = "public" | "private";
type BackendParticipantStatus =
  | "pending_approval"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "left"
  | "attended"
  | "no_show";
type BackendPaymentMethodType = "MANUAL_QR" | "MANUAL_BANK_TRANSFER";
type BackendPaymentStatus =
  | "not_required"
  | "pending_upload"
  | "submitted"
  | "verified"
  | "rejected";
type BackendViewerEventState =
  | "anonymous"
  | "none"
  | "interested"
  | "pending_approval"
  | "going"
  | "rejected"
  | "left"
  | "cancelled";

type _eventTypeMatches = Assert<IsEqual<Event["type"], BackendEventType>>;
type _createTypeMatches = Assert<IsEqual<CreateEventRequest["type"], BackendEventType>>;
type _updateTypeMatches = Assert<IsEqual<Exclude<UpdateEventRequest["type"], undefined>, BackendEventType>>;
type _filterTypeMatches = Assert<IsEqual<Exclude<EventFilters["type"], undefined>, BackendEventType>>;
type _eventStatusMatches = Assert<IsEqual<Event["status"], BackendEventStatus>>;
type _updateStatusMatches = Assert<IsEqual<Exclude<UpdateEventRequest["status"], undefined>, BackendEventStatus>>;
type _filterStatusMatches = Assert<IsEqual<Exclude<EventFilters["status"], undefined>, BackendEventStatus>>;
type _eventVisibilityMatches = Assert<IsEqual<Event["visibility"], BackendEventVisibility>>;
type _participantStatusMatches = Assert<IsEqual<EventParticipant["status"], BackendParticipantStatus>>;
type _paymentMethodMatches = Assert<IsEqual<EventPaymentMethod["type"], BackendPaymentMethodType>>;
type _paymentStatusMatches = Assert<IsEqual<EventParticipantPayment["status"], BackendPaymentStatus>>;
type _viewerEventStateMatches = Assert<IsEqual<EventViewerEventState, BackendViewerEventState>>;
type _eventViewerEventStateMatches = Assert<IsEqual<Event["viewerEventState"], BackendViewerEventState>>;
type _eventInterestedCountShape = Assert<IsEqual<Event["interestedCount"], number>>;
type _eventGoingCountShape = Assert<IsEqual<Event["goingCount"], number>>;
type _eventViewerInterestedShape = Assert<IsEqual<Event["viewerInterested"], boolean>>;
type _joinNoteMatches = Assert<IsEqual<JoinEventRequest["participantNote"], string | undefined>>;
type _paymentProofUrlShape = Assert<IsEqual<EventPaymentProofUrl["url"], string>>;
type _paymentMethodUpdateIsPartial = Assert<
  IsEqual<UpdateEventPaymentMethodRequest["name"], string | undefined>
>;

test("event shared contracts compile against backend enums", () => {
  assert.equal(true, true);
});
