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
