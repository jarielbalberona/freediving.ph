import assert from "node:assert/strict";
import test from "node:test";

import type { CreateEventRequest, Event, EventAttendee, EventFilters, UpdateEventRequest } from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type BackendEventType =
  | "DIVE_SESSION"
  | "TRAINING"
  | "COMPETITION"
  | "SOCIAL"
  | "WORKSHOP"
  | "MEETUP"
  | "TOURNAMENT"
  | "FUNDRAISER";

type BackendEventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | "POSTPONED" | "REMOVED";
type BackendAttendeeStatus = "registered" | "attended" | "cancelled" | "no_show";

type _eventTypeMatches = Assert<IsEqual<Event["type"], BackendEventType>>;
type _createTypeMatches = Assert<IsEqual<CreateEventRequest["type"], BackendEventType>>;
type _updateTypeMatches = Assert<IsEqual<Exclude<UpdateEventRequest["type"], undefined>, BackendEventType>>;
type _filterTypeMatches = Assert<IsEqual<Exclude<EventFilters["type"], undefined>, BackendEventType>>;
type _eventStatusMatches = Assert<IsEqual<Event["status"], BackendEventStatus>>;
type _updateStatusMatches = Assert<IsEqual<Exclude<UpdateEventRequest["status"], undefined>, BackendEventStatus>>;
type _filterStatusMatches = Assert<IsEqual<Exclude<EventFilters["status"], undefined>, BackendEventStatus>>;
type _attendeeStatusMatches = Assert<IsEqual<EventAttendee["status"], BackendAttendeeStatus>>;

test("event shared contracts compile against backend enums", () => {
  assert.equal(true, true);
});
