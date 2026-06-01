import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("events organizer management uses backend organizer contracts", () => {
  const api = read("src/features/events/api/events-api.ts");
  const hooks = read("src/features/events/hooks/use-event-management.ts");

  assert.match(api, /getEventParticipants/);
  assert.match(api, /approveEventParticipant/);
  assert.match(api, /rejectEventParticipant/);
  assert.match(api, /updateEventParticipantStatus/);
  assert.match(api, /reviewEventPayment/);
  assert.match(api, /getEventPaymentProofUrl/);
  assert.match(api, /checkInEventPass/);
  assert.match(api, /EventParticipant/);
  assert.match(api, /EventPaymentProofUrl/);

  assert.match(hooks, /useEventParticipantsQuery/);
  assert.match(hooks, /useEventParticipantActionMutation/);
  assert.match(hooks, /useEventPaymentReviewMutation/);
  assert.match(hooks, /useEventCheckInMutation/);
  assert.match(hooks, /getRequiredToken/);
  assert.match(hooks, /mobileQueryKeys\.events\.participants/);
});

test("events organizer management is route-gated and destructive actions are confirmed", () => {
  const detailScreen = read("src/features/events/screens/event-detail-screen.tsx");
  const managementScreen = read(
    "src/features/events/screens/event-organizer-management-screen.tsx",
  );
  const route = read("app/(app)/(tabs)/(home)/events/[slug]/manage.tsx");
  const layout = read("app/(app)/(tabs)/(home)/_layout.tsx");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(detailScreen, /event\.viewerCanManage/);
  assert.match(detailScreen, /Manage event/);
  assert.match(route, /EventOrganizerManagementScreen/);
  assert.match(layout, /events\/\[slug\]\/manage/);
  assert.match(resolver, /parts\[2\] === "manage"/);

  assert.match(managementScreen, /Organizer access required/);
  assert.match(managementScreen, /event\?\.viewerCanManage/);
  assert.match(managementScreen, /useAuth/);
  assert.match(managementScreen, /Alert\.alert/);
  assert.match(managementScreen, /Reject participant/);
  assert.match(managementScreen, /Reject payment/);
  assert.match(managementScreen, /Check in pass/);
  assert.doesNotMatch(managementScreen, /deleteEvent|deleteSponsor|Delete event/);
});
