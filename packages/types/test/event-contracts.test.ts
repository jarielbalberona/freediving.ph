import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateEventRequest,
  Event,
  EventFilters,
  EventModuleKey,
  EventParticipant,
  EventParticipantPayment,
  EventPaymentMethod,
  EventPaymentProofUrl,
  EventProgramItem,
  EventViewerEventState,
  JoinEventRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventRequest,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

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

type BackendEventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "completed"
  | "archived";
type BackendEventVisibility = "public" | "private";
type BackendParticipantStatus =
  | "pending_approval"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "left"
  | "attended"
  | "no_show";
type BackendPaymentMethodType = "manual_qr" | "bank_transfer";
type BackendPaymentMode = "free" | "required" | "optional";
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
type _createTypeMatches = Assert<
  IsEqual<CreateEventRequest["type"], BackendEventType>
>;
type _createDescriptionIsOptional = Assert<
  IsEqual<CreateEventRequest["descriptionMarkdown"], string | undefined>
>;
type _createCapacityIsOptional = Assert<
  IsEqual<CreateEventRequest["capacity"], number | undefined>
>;
type _createDifficultyIsOptional = Assert<
  IsEqual<CreateEventRequest["difficulty"], Event["difficulty"] | undefined>
>;
type _updateTypeMatches = Assert<
  IsEqual<Exclude<UpdateEventRequest["type"], undefined>, BackendEventType>
>;
type _filterTypeMatches = Assert<
  IsEqual<Exclude<EventFilters["type"], undefined>, BackendEventType>
>;
type _eventStatusMatches = Assert<IsEqual<Event["status"], BackendEventStatus>>;
type _updateStatusMatches = Assert<
  IsEqual<Exclude<UpdateEventRequest["status"], undefined>, BackendEventStatus>
>;
type _filterStatusMatches = Assert<
  IsEqual<Exclude<EventFilters["status"], undefined>, BackendEventStatus>
>;
type _eventVisibilityMatches = Assert<
  IsEqual<Event["visibility"], BackendEventVisibility>
>;
type _participantStatusMatches = Assert<
  IsEqual<EventParticipant["status"], BackendParticipantStatus>
>;
type _paymentMethodMatches = Assert<
  IsEqual<EventPaymentMethod["type"], BackendPaymentMethodType>
>;
type _paymentModeMatches = Assert<
  IsEqual<Event["paymentMode"], BackendPaymentMode>
>;
type _paymentStatusMatches = Assert<
  IsEqual<EventParticipantPayment["status"], BackendPaymentStatus>
>;
type _viewerEventStateMatches = Assert<
  IsEqual<EventViewerEventState, BackendViewerEventState>
>;
type _eventViewerEventStateMatches = Assert<
  IsEqual<Event["viewerEventState"], BackendViewerEventState>
>;
type _eventInterestedCountShape = Assert<
  IsEqual<Event["interestedCount"], number>
>;
type _eventGoingCountShape = Assert<IsEqual<Event["goingCount"], number>>;
type _eventLogoMediaIdShape = Assert<
  IsEqual<Event["logoMediaId"], string | null | undefined>
>;
type _eventLogoUrlShape = Assert<
  IsEqual<Event["logoUrl"], string | null | undefined>
>;
type _eventCoverMediaIdShape = Assert<
  IsEqual<Event["coverMediaId"], string | null | undefined>
>;
type _eventCoverUrlShape = Assert<
  IsEqual<Event["coverUrl"], string | null | undefined>
>;
type _eventLegacyCoverPhotoUrlShape = Assert<
  IsEqual<Event["coverPhotoUrl"], string | null | undefined>
>;
type _eventViewerInterestedShape = Assert<
  IsEqual<Event["viewerInterested"], boolean>
>;
type _joinNoteMatches = Assert<
  IsEqual<JoinEventRequest["participantNote"], string | undefined>
>;
type _paymentProofUrlShape = Assert<
  IsEqual<EventPaymentProofUrl["url"], string>
>;
type _paymentMethodUpdateIsPartial = Assert<
  IsEqual<UpdateEventPaymentMethodRequest["name"], string | undefined>
>;
type _programModuleKeyExists = Assert<
  IsEqual<Extract<EventModuleKey, "program">, "program">
>;
type _programItemShape = Assert<IsEqual<EventProgramItem["title"], string>>;

test("event shared contracts compile against backend enums", () => {
  assert.equal(true, true);
});
