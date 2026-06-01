import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile exposes canonical buddy relationship API and queries", () => {
  const api = read("src/features/buddies/api/buddies-api.ts");
  const queries = read("src/features/buddies/hooks/use-buddy-relationship-queries.ts");
  const mutations = read("src/features/buddies/hooks/use-buddy-mutations.ts");
  const keys = read("src/lib/query/query-keys.ts");

  for (const pathPart of [
    "/v1/buddies",
    "/requests/incoming",
    "/requests/outgoing",
    "/requests",
    "/accept",
    "/decline",
    "/preview",
  ]) {
    assert.match(api, new RegExp(pathPart));
  }
  for (const symbol of [
    "useBuddyListQuery",
    "useIncomingBuddyRequestsQuery",
    "useOutgoingBuddyRequestsQuery",
    "useBuddyPreviewQuery",
  ]) {
    assert.match(queries, new RegExp(symbol));
  }
  for (const symbol of [
    "useSendBuddyRequestMutation",
    "useAcceptBuddyRequestMutation",
    "useDeclineBuddyRequestMutation",
    "useCancelBuddyRequestMutation",
    "useRemoveBuddyMutation",
  ]) {
    assert.match(mutations, new RegExp(symbol));
  }
  assert.match(keys, /relationships/);
  assert.match(keys, /incomingRequests/);
  assert.match(keys, /outgoingRequests/);
});

test("mobile distinguishes Buddy Finder intents from buddy relationships", () => {
  const buddiesScreen = read("src/features/buddies/screens/buddies-screen.tsx");
  const relationshipSection = read("src/features/buddies/components/buddy-relationship-section.tsx");
  const intentCard = read("src/features/buddies/components/buddy-intent-card.tsx");

  assert.match(buddiesScreen, /BuddyRelationshipSection/);
  assert.match(buddiesScreen, /Buddy relationships/);
  assert.match(buddiesScreen, /Your buddy intent/);
  assert.match(relationshipSection, /Incoming/);
  assert.match(relationshipSection, /Outgoing/);
  assert.match(relationshipSection, /Buddies/);
  assert.doesNotMatch(intentCard, /acceptBuddyRequest|removeBuddy|BuddyRelationship/);
});

test("profile and Buddy Finder can open canonical message threads", () => {
  const profileActions = read("src/features/buddies/components/profile-buddy-actions.tsx");
  const publicProfile = read("src/features/profiles/screens/public-profile-screen.tsx");
  const buddyMutations = read("src/features/buddies/hooks/use-buddy-mutations.ts");
  const messageMutations = read("src/features/messages/hooks/use-message-mutations.ts");

  assert.match(publicProfile, /ProfileBuddyActions/);
  assert.match(profileActions, /useOpenDirectMessageThreadMutation/);
  assert.match(profileActions, /viewerRelationship\?\.canMessage/);
  assert.match(profileActions, /Add buddy/);
  assert.match(profileActions, /Remove buddy/);
  assert.match(profileActions, /Message/);
  assert.match(buddyMutations, /getBuddyFinderMessageEntry/);
  assert.match(buddyMutations, /openDirectMessageThread/);
  assert.match(messageMutations, /useOpenDirectMessageThreadMutation/);
});

test("notifications support message routing plus read and delete controls", () => {
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");
  const notificationsApi = read("src/features/notifications/api/notifications-api.ts");
  const notificationMutations = read("src/features/notifications/hooks/use-notification-mutations.ts");
  const notificationCard = read("src/features/notifications/components/notification-card.tsx");
  const notificationsScreen = read("src/features/notifications/screens/notifications-screen.tsx");

  assert.match(resolver, /parts\[0\] === "messages"/);
  assert.match(notificationsApi, /markNotificationRead/);
  assert.match(notificationsApi, /deleteNotification/);
  assert.match(notificationMutations, /useMarkNotificationReadMutation/);
  assert.match(notificationMutations, /useDeleteNotificationMutation/);
  assert.match(notificationCard, /Mark read/);
  assert.match(notificationCard, /Delete/);
  assert.match(notificationsScreen, /ManageableNotificationCard/);
});
