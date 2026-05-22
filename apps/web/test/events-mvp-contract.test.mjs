import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("events MVP uses dedicated create page with required dive-site selection", () => {
  const createPage = read("src/app/events/create/page.tsx");
  assert.match(createPage, /DiveSiteCombobox/);
  assert.match(createPage, /diveSiteId/);
  assert.match(createPage, /MarkdownEditor/);
  assert.match(createPage, /paymentMethods/);
  assert.match(createPage, /MANUAL_QR/);
  assert.match(createPage, /MANUAL_BANK_TRANSFER/);
  assert.doesNotMatch(createPage, /LocationSearch/);
});

test("events listing links to create page and no longer owns create dialog", () => {
  const eventsPage = read("src/app/events/page.tsx");
  assert.match(eventsPage, /href="\/events\/create"/);
  assert.match(eventsPage, /DiveSiteCombobox/);
  assert.match(eventsPage, /Load more/);
  assert.doesNotMatch(eventsPage, /DialogContent/);
  assert.doesNotMatch(eventsPage, /useCreateEvent/);
});

test("events detail exposes join, payment proof, and organizer review controls", () => {
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  const api = read("src/features/events/api/events.ts");
  assert.match(detailPage, /participantNote/);
  assert.match(detailPage, /useMarkEventInterested/);
  assert.match(detailPage, /Remove interest/);
  assert.match(detailPage, /mediaApi\.upload/);
  assert.match(detailPage, /submitPaymentMutation/);
  assert.match(detailPage, /useEventPaymentProofUrl/);
  assert.match(api, /\/payments\/\$\{paymentId\}\/proof-url/);
  assert.doesNotMatch(detailPage, /href=\{payment\.proofAttachmentUrl\}/);
  assert.match(detailPage, /Approve/);
  assert.match(detailPage, /Verify payment/);
  assert.match(detailPage, /viewerCanViewPrivateDetails/);
  assert.match(detailPage, /useEvent\(slug\)/);
  assert.doesNotMatch(detailPage, /useEventParticipants\(slug/);
});

test("events expose interested and going state without interested identities", () => {
  const eventCard = read("src/features/events/components/EventCard.tsx");
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  const api = read("src/features/events/api/events.ts");
  assert.match(eventCard, /interestedCount/);
  assert.match(eventCard, /goingCount/);
  assert.match(eventCard, /viewerEventState/);
  assert.match(eventCard, /Uninterested/);
  assert.match(detailPage, /interestedCount/);
  assert.match(detailPage, /goingCount/);
  assert.match(api, /markEventInterested/);
  assert.match(api, /markEventUninterested/);
  assert.match(api, /\/interest/);
  assert.doesNotMatch(detailPage, /interestedUsers/);
  assert.doesNotMatch(eventCard, /interestedUsers/);
});

test("event create converts datetime-local as event timezone wall-clock time", () => {
  const createPage = read("src/app/events/create/page.tsx");
  assert.match(createPage, /toISO\(form\.startsAt, timezone\)/);
  assert.match(createPage, /Intl\.DateTimeFormat/);
  assert.match(createPage, /timeZone/);
  assert.doesNotMatch(createPage, /new Date\(value\)\.toISOString\(\)/);
});

test("events API client targets canonical fphgo v1 event endpoints", () => {
  const api = read("src/features/events/api/events.ts");
  assert.match(api, /\/v1\/events/);
  assert.match(api, /getEventBySlug/);
  assert.match(api, /\/participants\/\$\{participantId\}\/approve/);
  assert.match(api, /\/payments\/\$\{paymentId\}\/verify/);
  assert.match(api, /payment-methods/);
  assert.doesNotMatch(api, /apps\/api/);
});
