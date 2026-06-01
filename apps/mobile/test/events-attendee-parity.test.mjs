import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("events attendee parity uses shared contracts and attendee-safe routes", () => {
  const api = read("src/features/events/api/events-api.ts");
  const mutations = read("src/features/events/hooks/use-event-mutations.ts");
  const queries = read("src/features/events/hooks/use-event-attendee-queries.ts");

  assert.match(api, /EventJoinFormField/);
  assert.match(api, /EventPass/);
  assert.match(api, /EventPaymentMethod/);
  assert.match(api, /SubmitEventPaymentRequest/);
  assert.match(api, /getEventJoinFormFields/);
  assert.match(api, /getMyEventPass/);
  assert.match(api, /submitEventPayment/);
  assert.match(api, /getEventProgramItems/);
  assert.match(api, /getEventPrizes/);
  assert.match(api, /getEventSponsors/);
  assert.doesNotMatch(api, /ApproveParticipant|RejectParticipant|VerifyPayment/);

  assert.match(mutations, /joinEventWithAnswers/);
  assert.match(mutations, /joinAnswers/);
  assert.match(mutations, /submitEventPayment/);
  assert.match(mutations, /mobileQueryKeys\.events\.myPass/);

  assert.match(queries, /useEventJoinFormFieldsQuery/);
  assert.match(queries, /useMyEventPassQuery/);
  assert.match(queries, /useEventPassVerificationQuery/);
  assert.match(queries, /useEventProgramItemsQuery/);
  assert.match(queries, /useEventSponsorsQuery/);
});

test("events mobile screens expose attendee filters, pass, payment, and public detail modules", () => {
  const listScreen = read("src/features/events/screens/events-screen.tsx");
  const detailScreen = read("src/features/events/screens/event-detail-screen.tsx");
  const passScreen = read("src/features/events/screens/event-pass-screen.tsx");
  const route = read("app/(app)/(tabs)/(home)/events/[slug]/pass/[token].tsx");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(listScreen, /Search events/);
  assert.match(listScreen, /beginnerFriendly/);
  assert.match(listScreen, /price/);
  assert.match(listScreen, /eventTypeFilters/);

  assert.match(detailScreen, /Join form/);
  assert.match(detailScreen, /Optional note for the organizer/);
  assert.match(detailScreen, /Event pass/);
  assert.match(detailScreen, /Choose proof image/);
  assert.match(detailScreen, /Submit payment proof/);
  assert.match(detailScreen, /Program/);
  assert.match(detailScreen, /Competitions and prizes/);
  assert.match(detailScreen, /Sponsors/);
  assert.doesNotMatch(detailScreen, /Approve payment|Reject payment|Check in/);

  assert.match(passScreen, /read-only mobile pass view/i);
  assert.match(route, /EventPassScreen/);
  assert.match(resolver, /parts\[2\] === "pass"/);
});
