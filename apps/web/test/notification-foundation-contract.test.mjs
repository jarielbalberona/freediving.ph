import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const srcRoot = path.join(appRoot, "src");

const providerPath = path.join(
  srcRoot,
  "features/notifications/components/NotificationRealtimeProvider.tsx",
);
const layoutPath = path.join(srcRoot, "app/layout.tsx");
const notificationCenterPath = path.join(
  srcRoot,
  "components/nav/notification-center.tsx",
);
const sidebarPath = path.join(srcRoot, "components/ui/app-sidebar.tsx");
const bottomNavPath = path.join(srcRoot, "components/nav/bottom-nav.tsx");
const messageQueriesPath = path.join(
  srcRoot,
  "features/messages/hooks/queries.ts",
);
const messageApiPath = path.join(srcRoot, "features/messages/api/messages.ts");
const routesPath = path.join(srcRoot, "lib/api/fphgo-routes.ts");
const notificationApiPath = path.join(
  srcRoot,
  "features/notifications/api/notifications.ts",
);
const notificationMutationsPath = path.join(
  srcRoot,
  "features/notifications/hooks/mutations.ts",
);
const notificationsPagePath = path.join(srcRoot, "app/notifications/page.tsx");
const notificationCardPath = path.join(
  srcRoot,
  "features/notifications/components/NotificationCard.tsx",
);
const chikaRealtimePath = path.join(
  srcRoot,
  "features/chika/hooks/realtime.ts",
);
const notificationSchemasPath = path.join(
  srcRoot,
  "features/notifications/schemas.ts",
);

test("notification realtime provider is mounted globally and uses persisted queries as source of truth", async () => {
  const [provider, layout] = await Promise.all([
    readFile(providerPath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);

  assert.match(layout, /<NotificationRealtimeProvider \/>/);
  assert.match(provider, /parsed\.type === "notification\.created"/);
  assert.match(provider, /queryKeys\.notifications\.stats\(\)/);
  assert.match(provider, /queryKeys\.notifications\.list\(\)/);
  assert.match(provider, /queryKeys\.notifications\.lists\(\)/);
  assert.match(provider, /toast\.info\(notification\.title/);
  assert.match(provider, /messageQueryKeys\.unreadCount\(\)/);
  assert.match(provider, /parsed\.type === "message\.created"/);
  assert.match(provider, /senderUserId === currentUserId/);
  assert.doesNotMatch(provider, /chika\./);
});

test("bell badge reads server notification stats", async () => {
  const source = await readFile(notificationCenterPath, "utf8");

  assert.match(source, /useNotificationStats\(\)/);
  assert.match(source, /statsQuery\.data\?\.unread/);
  assert.match(source, /formatBadge\(unreadCount\)/);
  assert.match(source, /border-primary\/30/);
  assert.doesNotMatch(source, /variant="destructive"/);
});

test("message nav badges use message unread count, not generic notification count", async () => {
  const [sidebar, bottomNav, queries, api, routes] = await Promise.all([
    readFile(sidebarPath, "utf8"),
    readFile(bottomNavPath, "utf8"),
    readFile(messageQueriesPath, "utf8"),
    readFile(messageApiPath, "utf8"),
    readFile(routesPath, "utf8"),
  ]);

  for (const source of [sidebar, bottomNav]) {
    assert.match(source, /useMessageUnreadCount/);
    assert.match(source, /messageUnreadQuery\.data\?\.unreadCount/);
    assert.match(source, /item\.id === "messages"/);
    assert.doesNotMatch(source, /useNotificationStats/);
  }
  assert.match(queries, /messageQueryKeys\.unreadCount\(\)/);
  assert.match(api, /getUnreadCount/);
  assert.match(api, /MessagingUnreadCountResponse/);
  assert.match(routes, /unreadCount/);
  assert.match(routes, /\/v1\/messages\/unread-count/);
});

test("frontend no longer exposes generic client notification creation", async () => {
  const [api, mutations] = await Promise.all([
    readFile(notificationApiPath, "utf8"),
    readFile(notificationMutationsPath, "utf8"),
  ]);

  assert.doesNotMatch(api, /createNotification:/);
  assert.doesNotMatch(api, /CreateNotificationRequest/);
  assert.doesNotMatch(mutations, /useCreateNotification/);
});

test("notification settings page can toggle new dive-site announcements", async () => {
  const page = await readFile(notificationsPagePath, "utf8");

  assert.match(page, /useNotificationSettings/);
  assert.match(page, /useUpdateNotificationSettings/);
  assert.match(page, /newDiveSitePublished/);
  assert.match(page, /New approved dive-site announcements/);
});

test("notification settings and schemas include scoped social notification controls", async () => {
  const [page, schemas] = await Promise.all([
    readFile(notificationsPagePath, "utf8"),
    readFile(notificationSchemasPath, "utf8"),
  ]);

  assert.match(schemas, /DIVE_SITE_SUBMITTED_FOR_REVIEW/);
  assert.match(page, /chikaReplies/);
  assert.match(page, /Chika Replies/);
  for (const type of [
    "CHIKA_THREAD_COMMENTED",
    "CHIKA_COMMENT_REPLIED",
    "GROUP_INVITE_RECEIVED",
    "GROUP_POST_CREATED",
    "EVENT_CREATED_FOR_GROUP",
    "EVENT_ATTENDEE_JOINED",
    "EVENT_UPDATED",
    "EVENT_CANCELLED",
  ]) {
    assert.match(schemas, new RegExp(type));
  }
});

test("notification card renders friendly social labels and app-relative actions", async () => {
  const source = await readFile(notificationCardPath, "utf8");

  assert.match(source, /bg-sky-500/);
  assert.match(source, /border-sky-500\/30 bg-sky-500\/10/);
  assert.match(source, /CHIKA_THREAD_COMMENTED: "Chika comment"/);
  assert.match(source, /CHIKA_COMMENT_REPLIED: "Chika reply"/);
  assert.match(source, /GROUP_INVITE_RECEIVED: "Group invite"/);
  assert.match(source, /GROUP_POST_CREATED: "Group post"/);
  assert.match(source, /EVENT_CANCELLED: "Event cancelled"/);
  assert.match(source, /DIVE_SITE_SUBMITTED_FOR_REVIEW: "Dive site review"/);
  assert.match(source, /notification\.actionUrl\?\.startsWith\("\/"\)/);
  assert.match(source, /!notification\.actionUrl\.startsWith\("\/\/"\)/);
  assert.match(source, /href=\{actionURL\}/);
});

test("chika realtime no longer emits broad toast notifications or consumes real actor ids", async () => {
  const source = await readFile(chikaRealtimePath, "utf8");

  assert.doesNotMatch(source, /authorUserId/);
  assert.doesNotMatch(source, /actorUserId/);
  assert.doesNotMatch(source, /New Chika posted/);
  assert.doesNotMatch(source, /New chika reply/);
});
