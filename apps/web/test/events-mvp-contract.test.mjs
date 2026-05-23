import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("events create page stays limited to first-step event fields", () => {
  const createPage = read("src/app/events/create/page.tsx");
  assert.match(createPage, /DiveSiteCombobox/);
  assert.match(createPage, /diveSiteId/);
  assert.match(createPage, /Event details/);
  assert.match(createPage, /Schedule/);
  assert.match(createPage, /Access/);
  assert.match(createPage, /Paid event/);
  assert.match(createPage, /pb-24/);
  assert.doesNotMatch(createPage, /MarkdownEditor/);
  assert.doesNotMatch(createPage, /Full description/);
  assert.doesNotMatch(createPage, /label="Timezone"/);
  assert.doesNotMatch(createPage, /Freediving specifics/);
  assert.doesNotMatch(createPage, /Capacity/);
  assert.doesNotMatch(createPage, /Payment methods/);
  assert.doesNotMatch(createPage, /MANUAL_QR/);
  assert.doesNotMatch(createPage, /MANUAL_BANK_TRANSFER/);
  assert.doesNotMatch(createPage, /priceAmount/);
  assert.doesNotMatch(createPage, /LocationSearch/);
});

test("events create payload defaults Philippine time and defers advanced setup", () => {
  const createPage = read("src/app/events/create/page.tsx");
  assert.match(createPage, /CREATE_EVENT_TIMEZONE = "Asia\/Manila"/);
  assert.match(createPage, /toISO\(form\.startsAt, CREATE_EVENT_TIMEZONE\)/);
  assert.match(createPage, /timezone: CREATE_EVENT_TIMEZONE/);
  assert.match(createPage, /isPaid: form\.isPaid/);
  assert.match(createPage, /items=\{eventTypeOptions\}/);
  assert.match(createPage, /value \?\? "fun_dive"/);
  assert.match(createPage, /Create event/);
  assert.doesNotMatch(createPage, /descriptionMarkdown,/);
  assert.doesNotMatch(createPage, /capacity,/);
  assert.doesNotMatch(createPage, /difficulty,/);
  assert.doesNotMatch(createPage, /paymentMethods/);
});

test("events create and management use user-facing labels", () => {
  const createPage = read("src/app/events/create/page.tsx");
  const constants = read("src/features/events/constants.ts");
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  assert.match(createPage, /Anyone can view the event/);
  assert.match(createPage, /Only limited details are shown publicly/);
  assert.match(constants, /label: "Fun dive"/);
  assert.doesNotMatch(createPage, />fun_dive</);
  assert.match(detailPage, /Manage event/);
  assert.match(detailPage, /Add more details for participants/);
  assert.match(detailPage, /Payment setup is incomplete/);
  assert.match(detailPage, /Edit description/);
  assert.match(detailPage, /Edit schedule and dive site/);
  assert.match(detailPage, /Edit capacity and access/);
  assert.match(detailPage, /Manage payment methods/);
  assert.match(detailPage, /Freediving details/);
  assert.match(detailPage, /Safety and logistics/);
  assert.doesNotMatch(detailPage, /Organizer setup/);
  assert.doesNotMatch(detailPage, /Complete advanced details after the event exists/);
  assert.doesNotMatch(detailPage, /Payment amount pending/);
  assert.doesNotMatch(detailPage, /Join flow/);
});

test("events listing links to create page and no longer owns create dialog", () => {
  const eventsPage = read("src/app/events/page.tsx");
  assert.match(eventsPage, /href="\/events\/create"/);
  assert.match(eventsPage, /DiveSiteCombobox/);
  assert.match(eventsPage, /Load more/);
  assert.doesNotMatch(eventsPage, /DialogContent/);
  assert.doesNotMatch(eventsPage, /useCreateEvent/);
});

test("events discovery page keeps compact friendly filters", () => {
  const eventsPage = read("src/app/events/page.tsx");
  assert.match(
    eventsPage,
    /Find freediving sessions, trips, courses, and community events/,
  );
  assert.match(eventsPage, /Browse events/);
  assert.match(eventsPage, /placeholder="Search events"/);
  assert.match(eventsPage, /All dive sites/);
  assert.match(
    eventsPage,
    /diveSiteId: diveSiteId === "all" \? undefined : diveSiteId/,
  );
  assert.match(
    eventsPage,
    /allOption=\{\{ value: "all", label: "All dive sites" \}\}/,
  );
  assert.match(eventsPage, /All types/);
  assert.match(eventsPage, /Free or paid/);
  assert.match(eventsPage, /Free events/);
  assert.match(eventsPage, /Paid events/);
  assert.match(eventsPage, /items=\{EVENT_TYPE_FILTER_ITEMS\}/);
  assert.match(eventsPage, /items=\{PRICE_FILTER_ITEMS\}/);
  assert.match(eventsPage, /<div className="grid gap-3">/);
  assert.match(
    eventsPage,
    /sm:grid-cols-2 md:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/,
  );
  assert.doesNotMatch(eventsPage, /grid grid-cols-2 gap-2/);
  assert.match(
    eventsPage,
    /setEventType\(\(value \?\? "all"\) as EventTypeFilter\)/,
  );
  assert.match(eventsPage, /setPrice\(\(value \?\? "all"\) as PriceFilter\)/);
  assert.doesNotMatch(eventsPage, /difficulty/i);
  assert.doesNotMatch(eventsPage, /beginner/i);
  assert.doesNotMatch(eventsPage, /Default zone/);
  assert.doesNotMatch(eventsPage, /payment instructions/i);
  assert.doesNotMatch(eventsPage, /attendee identities/i);
  assert.doesNotMatch(eventsPage, /placeholder="Event type"/);
  assert.doesNotMatch(eventsPage, /placeholder="Price"/);
});

test("events empty state and cards avoid raw discovery labels", () => {
  const eventsPage = read("src/app/events/page.tsx");
  const eventCard = read("src/features/events/components/EventCard.tsx");
  const eventList = read("src/features/events/components/EventList.tsx");
  assert.match(eventsPage, /No events found/);
  assert.match(eventsPage, /Try changing your filters or create a new event/);
  assert.match(eventList, /No events found/);
  assert.match(eventList, /Try changing your filters or create a new event/);
  assert.match(eventCard, /eventOptionLabel\(event\.type\)/);
  assert.doesNotMatch(eventCard, /titleCase\(event\.difficulty\)/);
  assert.doesNotMatch(eventCard, />fun_dive</);
  assert.doesNotMatch(eventCard, />pool_training</);
  assert.doesNotMatch(eventCard, />certification_course</);
});

test("events detail exposes join, payment proof, and organizer review controls", () => {
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  const api = read("src/features/events/api/events.ts");
  assert.match(detailPage, /participantNote/);
  assert.match(detailPage, /joinDialogOpen/);
  assert.match(detailPage, /useMarkEventInterested/);
  assert.match(detailPage, /Remove interest/);
  assert.match(detailPage, /AlertDialog/);
  assert.match(detailPage, /Leave event/);
  assert.match(detailPage, /mediaApi\.upload/);
  assert.match(detailPage, /submitPaymentMutation/);
  assert.match(detailPage, /useEventPaymentProofUrl/);
  assert.match(detailPage, /Upload payment proof/);
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

test("events detail organizes content into visibility-aware tabs", () => {
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  assert.match(detailPage, /Tabs, TabsContent, TabsList, TabsTrigger/);
  assert.match(detailPage, /value="overview"/);
  assert.match(detailPage, /value="join"/);
  assert.match(detailPage, /value="participants"/);
  assert.match(detailPage, /value="payment"/);
  assert.match(detailPage, /value="manage"/);
  assert.match(detailPage, /DiveSiteCombobox/);
  assert.match(detailPage, /toISO\(startsAt, event\.timezone \|\| EVENT_DETAIL_TIMEZONE\)/);
  assert.match(detailPage, /const canShowJoinTab =/);
  assert.match(detailPage, /const canShowParticipantsTab =/);
  assert.match(detailPage, /const canShowPaymentTab =/);
  assert.match(detailPage, /const canShowManageTab = event\.viewerCanManage/);
  assert.match(detailPage, /event\.visibility === "public" \|\|/);
  assert.match(detailPage, /event\.viewerCanViewPrivateDetails/);
  assert.match(detailPage, /event\.viewerCanManage/);
});

test("events detail overview avoids raw not-set label rows for viewers", () => {
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  assert.match(detailPage, /OverviewTab/);
  assert.match(detailPage, /Some event details are missing\. Add them from Manage\./);
  assert.match(detailPage, /getLogisticsSections/);
  assert.match(detailPage, /filter\(\(section\): section is \{ title: string; body: string \}/);
  assert.doesNotMatch(detailPage, /function DetailRow/);
  assert.doesNotMatch(detailPage, /label="Max depth"/);
  assert.doesNotMatch(detailPage, /Beginner-friendly"\s*\?\s*"Yes"\s*:\s*"No"/);
});

test("events detail keeps private identities and payment proof flows protected", () => {
  const detailPage = read("src/app/events/[slug]/client-page.tsx");
  assert.match(detailPage, /Private event details, payment instructions, and attendee identities/);
  assert.match(detailPage, /const canShowIdentities =/);
  assert.match(detailPage, /Identities are hidden for\s+private events\./);
  assert.match(detailPage, /event\.isPaid && \(event\.viewerJoined \|\| event\.viewerCanManage\)/);
  assert.match(detailPage, /window\.open\(proof\.url, "_blank", "noopener,noreferrer"\)/);
  assert.doesNotMatch(detailPage, /interestedUsers/);
});

test("event create converts datetime-local as event timezone wall-clock time", () => {
  const createPage = read("src/app/events/create/page.tsx");
  assert.match(createPage, /toISO\(form\.startsAt, CREATE_EVENT_TIMEZONE\)/);
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
