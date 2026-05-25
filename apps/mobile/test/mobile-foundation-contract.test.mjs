import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile package aligns with repository tooling decisions", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(
    pkg.scripts.lint,
    "biome lint app src test app.json babel.config.cjs metro.config.cjs tailwind.config.cjs",
  );
  assert.ok(!JSON.stringify(pkg).includes("eslint"));
  assert.ok(!JSON.stringify(pkg).includes("prettier"));
  assert.ok(!pkg.scripts["reset-project"]);
  assert.ok(!pkg.dependencies.axios);
  assert.ok(!pkg.dependencies["drizzle-orm"]);
  assert.ok(pkg.dependencies["expo-sqlite"]);
  assert.ok(!pkg.dependencies["@expo/ui"]);
  assert.ok(!pkg.dependencies["expo-glass-effect"]);
});

test("mobile routes stay thin and shell-backed", () => {
  assert.ok(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/(home)/index.tsx")),
  );
  assert.ok(
    fs.existsSync(path.join(root, "src/components/shell/mobile-app-shell.tsx")),
  );
  assert.ok(fs.existsSync(path.join(root, "src/lib/api/fphgo-client.ts")));
});

test("required environment contract is documented", () => {
  const example = read(".env.example");
  const readme = read("README.md");

  assert.match(example, /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/);
  assert.match(example, /EXPO_PUBLIC_API_BASE_URL=/);
  assert.match(readme, /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/);
  assert.match(readme, /EXPO_PUBLIC_API_BASE_URL=/);
  assert.match(readme, /Biome/);
  assert.doesNotMatch(readme, /ESLint/);
  assert.doesNotMatch(readme, /Prettier/);
});

test("protected fphgo query helper gates on Clerk readiness", () => {
  const helper = read("src/lib/query/use-authenticated-fphgo-query.ts");

  assert.match(helper, /useAuth/);
  assert.match(helper, /isLoaded/);
  assert.match(helper, /isSignedIn/);
  assert.match(helper, /enabled/);
  assert.match(helper, /getToken/);
});

test("home feed uses shared activity contracts and fetch client", () => {
  const api = read("src/features/home-feed/api/get-home-activity-feed.ts");
  const hook = read(
    "src/features/home-feed/hooks/use-home-activity-feed-query.ts",
  );
  const mapper = read("src/features/home-feed/lib/activity-card-model.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ActivityFeedResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/feed\/activity/);
  assert.doesNotMatch(api, /axios/i);
  assert.match(hook, /mobileQueryKeys\.feed\.activity/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
});

test("explore uses shared contracts, actions, and safe mobile routes", () => {
  const api = read("src/features/explore/api/explore-api.ts");
  const card = read("src/features/explore/components/explore-site-card.tsx");
  const detail = read(
    "src/features/explore/screens/explore-site-detail-screen.tsx",
  );
  const format = read("src/features/explore/lib/explore-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ExploreListResponse/);
  assert.match(api, /ExploreSiteDetailResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/explore\/sites/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/explore\/types/);
  assert.match(card, /safeSiteSlug/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(api, /CreateExploreSiteSubmissionRequest/);
  assert.match(api, /\/v1\/explore\/sites\/submit/);
  assert.match(api, /\/likes/);
  assert.match(api, /\/save/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(detail, /gps/i);
  assert.ok(format.includes('includes("/")'));
});

test("chika uses shared contracts, nested replies, and vote actions", () => {
  const api = read("src/features/chika/api/chika-api.ts");
  const card = read("src/features/chika/components/chika-thread-card.tsx");
  const detail = read(
    "src/features/chika/screens/chika-thread-detail-screen.tsx",
  );
  const format = read("src/features/chika/lib/chika-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ChikaThreadListResponse/);
  assert.match(api, /ChikaThreadResponse/);
  assert.match(api, /ChikaCommentListResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/chika\/threads/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/chika\/types/);
  assert.match(api, /ChikaCommentReactionResponse/);
  assert.match(api, /createChikaThread/);
  assert.match(api, /createChikaComment/);
  assert.match(api, /\/reactions/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(card, /safeChikaSlug/);
  assert.match(format, /authorDisplayName/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(detail, /parentCommentId/);
  assert.match(detail, /useSetChikaCommentReactionMutation/);
  assert.doesNotMatch(detail, /websocket|realtime/i);
  assert.ok(format.includes('includes("/")'));
});

test("events uses shared contracts and member event actions", () => {
  const api = read("src/features/events/api/events-api.ts");
  const card = read("src/features/events/components/event-card.tsx");
  const detail = read("src/features/events/screens/event-detail-screen.tsx");
  const format = read("src/features/events/lib/event-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /EventListResponse/);
  assert.match(api, /EventDetailResponse/);
  assert.match(api, /EventFilters/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/events/);
  assert.match(api, /status/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/events\/types/);
  assert.match(api, /joinEvent/);
  assert.match(api, /leaveEvent/);
  assert.match(api, /setEventInterest/);
  assert.match(api, /createEventPost/);
  assert.match(api, /updates\/.*reactions\/fish/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(card, /safeEventSlug/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(detail, /useEventAttendanceMutation/);
  assert.doesNotMatch(detail, /booking|checkIn|receipt/i);
  assert.ok(format.includes('includes("/")'));
});

test("profiles use shared contracts, auth gating, edit, posts, and diving", () => {
  const api = read("src/features/profiles/api/profiles-api.ts");
  const myHook = read("src/features/profiles/hooks/use-my-profile-query.ts");
  const publicHook = read(
    "src/features/profiles/hooks/use-public-profile-query.ts",
  );
  const ownScreen = read("src/features/profiles/screens/profile-screen.tsx");
  const publicScreen = read(
    "src/features/profiles/screens/public-profile-screen.tsx",
  );
  const format = read("src/features/profiles/lib/profile-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ProfileResponse/);
  assert.match(api, /PublicProfileResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/me\/profile/);
  assert.match(api, /\/v1\/profiles\/public/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(api, /auth:\s*"none"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(
    api,
    /features\/profile\/types|features\/profiles\/types/,
  );
  assert.match(api, /UpdateMyProfileRequest/);
  assert.match(api, /method:\s*"PATCH"/);
  assert.match(api, /\/posts/);
  assert.match(api, /\/diving/);
  assert.match(myHook, /useAuthenticatedFphgoQuery/);
  assert.doesNotMatch(publicHook, /useAuthenticatedFphgoQuery/);
  assert.match(publicHook, /useQuery/);
  assert.match(publicHook, /safeProfileUsername/);
  assert.match(ownScreen, /\/\(app\)\/\(tabs\)\/profile\/settings/);
  assert.match(publicScreen, /useLocalSearchParams/);
  assert.match(ownScreen, /Edit profile/);
  assert.doesNotMatch(ownScreen, /upload|followAction|sendMessage|SQLite|Drizzle/i);
  assert.doesNotMatch(
    publicScreen,
    /upload|editProfile|followAction|sendMessage|report|block/i,
  );
  assert.ok(format.includes('includes("/")'));
});

test("notifications use shared contracts, auth gating, preferences, and safe push routes", () => {
  const api = read("src/features/notifications/api/notifications-api.ts");
  const hook = read(
    "src/features/notifications/hooks/use-notifications-query.ts",
  );
  const settingsHook = read(
    "src/features/notifications/hooks/use-notification-settings-query.ts",
  );
  const settingsMutation = read(
    "src/features/notifications/hooks/use-notification-settings-mutation.ts",
  );
  const pushMutation = read(
    "src/features/notifications/hooks/use-register-push-device-mutation.ts",
  );
  const card = read(
    "src/features/notifications/components/notification-card.tsx",
  );
  const screen = read(
    "src/features/notifications/screens/notifications-screen.tsx",
  );
  const format = read("src/features/notifications/lib/notification-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ListNotificationsResponse/);
  assert.match(api, /NotificationFilters/);
  assert.match(api, /RegisterPushDeviceRequest/);
  assert.match(api, /UpdateNotificationSettingsRequest/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/notifications/);
  assert.match(api, /\/v1\/notifications\/devices/);
  assert.match(api, /\/v1\/notifications\/preferences/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/notifications\/types/);
  assert.match(api, /method:\s*"POST"/);
  assert.match(api, /method:\s*"PUT"/);
  assert.match(api, /method:\s*"DELETE"/);
  assert.match(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.notifications\.list/);
  assert.match(settingsHook, /mobileQueryKeys\.notifications\.settings/);
  assert.match(settingsMutation, /updateNotificationSettings/);
  assert.match(pushMutation, /registerPushDevice/);
  assert.match(pushMutation, /getToken/);
  assert.match(pushMutation, /Authentication required/);
  assert.match(card, /notificationHref/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/profile\/\[username\]/);
  assert.match(format, /notificationsFallbackHref/);
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.match(screen, /Enable push/);
  assert.match(screen, /Dive condition alerts/);
  assert.doesNotMatch(screen, /markAsRead|markAllAsRead|websocket|realtime/i);
});

test("Phase 4 location and push helpers stay foreground-only and user initiated", () => {
  const pkg = JSON.parse(read("package.json"));
  const appConfig = read("app.json");
  const push = read("src/features/notifications/lib/push-notifications.ts");
  const listener = read(
    "src/features/notifications/components/push-notification-route-listener.tsx",
  );
  const location = read("src/features/location/lib/foreground-location.ts");
  const screen = read(
    "src/features/notifications/screens/notifications-screen.tsx",
  );

  assert.ok(pkg.dependencies["expo-notifications"]);
  assert.ok(pkg.dependencies["expo-location"]);
  assert.match(appConfig, /locationWhenInUsePermission/);
  assert.doesNotMatch(appConfig, /locationAlways|UIBackgroundModes/i);
  assert.match(push, /requestPermissionsAsync/);
  assert.match(push, /getExpoPushTokenAsync/);
  assert.match(push, /Device\.isDevice/);
  assert.doesNotMatch(push, /getToken|registerPushDevice\(|setInterval|Background/i);
  assert.match(listener, /addNotificationResponseReceivedListener/);
  assert.match(listener, /notificationsFallbackHref/);
  assert.match(location, /requestForegroundPermissionsAsync/);
  assert.match(location, /getCurrentPositionAsync/);
  assert.doesNotMatch(location, /requestBackgroundPermissionsAsync|watchPositionAsync|startLocationUpdatesAsync/i);
  assert.match(screen, /Use my current area/);
  assert.match(screen, /diveConditionCoarseArea/);
  assert.doesNotMatch(screen, /background location|continuous tracking/i);
});

test("buddies use shared public and member intent contracts", () => {
  const api = read("src/features/buddies/api/buddies-api.ts");
  const hook = read("src/features/buddies/hooks/use-buddy-finder-query.ts");
  const card = read("src/features/buddies/components/buddy-intent-card.tsx");
  const screen = read("src/features/buddies/screens/buddies-screen.tsx");
  const format = read("src/features/buddies/lib/buddy-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /BuddyFinderPreviewResponse/);
  assert.match(api, /BuddyFinderListResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/buddy-finder\/preview/);
  assert.match(api, /\/v1\/buddy-finder\/intents/);
  assert.match(api, /auth:\s*"none"/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(
    api,
    /features\/buddies\/types|features\/buddy-finder\/types/,
  );
  assert.match(api, /CreateBuddyFinderIntentRequest/);
  assert.match(api, /createBuddyFinderIntent/);
  assert.match(api, /deleteBuddyFinderIntent/);
  assert.match(api, /getBuddyFinderMessageEntry/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.buddies\.preview/);
  assert.match(card, /BuddyFinderPreviewIntent/);
  assert.match(card, /BuddyFinderIntent/);
  assert.doesNotMatch(card, /Link|Pressable|buddyProfileHref/);
  assert.ok(format.includes('includes("/")'));
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.match(screen, /Create weekend intent/);
  assert.match(screen, /Close intent/);
  assert.doesNotMatch(screen, /gps|location/i);
});

test("messages and groups expose member-safe Phase 2 routes", () => {
  const messagesApi = read("src/features/messages/api/messages-api.ts");
  const messagesScreen = read("src/features/messages/screens/messages-screen.tsx");
  const messageThreadScreen = read(
    "src/features/messages/screens/message-thread-screen.tsx",
  );
  const groupsApi = read("src/features/groups/api/groups-api.ts");
  const groupDetailScreen = read(
    "src/features/groups/screens/group-detail-screen.tsx",
  );

  assert.match(messagesApi, /@freediving\.ph\/types/);
  assert.match(messagesApi, /\/v1\/messages\/threads/);
  assert.match(messagesApi, /sendThreadMessage/);
  assert.match(messagesApi, /acceptThreadRequest/);
  assert.match(messagesApi, /declineThreadRequest/);
  assert.match(messagesApi, /auth:\s*"required"/);
  assert.match(messagesScreen, /requests/);
  assert.match(messageThreadScreen, /canResolveRequest/);
  assert.match(messageThreadScreen, /Send/);
  assert.doesNotMatch(messageThreadScreen, /websocket|realtime|push/i);

  assert.match(groupsApi, /@freediving\.ph\/types/);
  assert.match(groupsApi, /\/v1\/groups/);
  assert.match(groupsApi, /joinGroup/);
  assert.match(groupsApi, /leaveGroup/);
  assert.match(groupsApi, /createGroupPost/);
  assert.match(groupsApi, /auth:\s*"required"/);
  assert.match(groupDetailScreen, /Join group/);
  assert.match(groupDetailScreen, /Post to group/);
  assert.doesNotMatch(groupDetailScreen, /admin|moderation/i);
});

test("local Phase 3 storage is bounded to drafts and sync outbox", () => {
  const database = read("src/local/db/database.ts");
  const types = read("src/local/db/types.ts");
  const draftRepo = read("src/local/drafts/drafts-repository.ts");
  const outboxRepo = read("src/local/outbox/outbox-repository.ts");
  const supported = read("src/local/outbox/supported-operations.ts");

  assert.match(database, /expo-sqlite/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS local_drafts/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS sync_outbox/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS local_media_queue/);
  assert.match(database, /PRAGMA user_version/);
  assert.doesNotMatch(database, /server|profile_posts|events|messages/i);
  assert.match(types, /LocalDraftStatus/);
  assert.match(types, /SyncOutboxStatus/);
  assert.match(types, /idempotencyKey/);
  assert.match(types, /OFFLINE_OPERATION_CLASSIFICATION/);
  assert.match(types, /message_send:\s*"online_only"/);
  assert.match(types, /event_join_leave:\s*"online_only"/);
  assert.match(types, /explore_site_submit:\s*"online_only"/);
  assert.match(types, /notification_mark_read:\s*"unsupported"/);
  assert.match(draftRepo, /saveLocalDraft/);
  assert.match(draftRepo, /getLatestLocalDraft/);
  assert.match(draftRepo, /discardLocalDraft/);
  assert.match(outboxRepo, /createOutboxItem/);
  assert.match(outboxRepo, /makeIdempotencyKey/);
  assert.match(outboxRepo, /markOutboxSynced/);
  assert.match(outboxRepo, /markOutboxFailed/);
  assert.match(supported, /QUEUEABLE_OPERATION_TYPES/);
  assert.doesNotMatch(supported, /message_send|event_join_leave|payment|booking/i);
});

test("sync runner is manual, idempotent, and server-response gated", () => {
  const syncRunner = read("src/local/sync/sync-runner.ts");
  const outboxHook = read("src/local/outbox/use-outbox.ts");
  const client = read("src/lib/api/fphgo-client.ts");
  const createScreen = read("src/features/create/screens/create-screen.tsx");
  const buddiesScreen = read("src/features/buddies/screens/buddies-screen.tsx");
  const chikaDetail = read("src/features/chika/screens/chika-thread-detail-screen.tsx");

  assert.match(client, /Idempotency-Key/);
  assert.match(syncRunner, /runSyncOutbox/);
  assert.match(syncRunner, /idempotencyKey:\s*item\.idempotencyKey/);
  assert.match(syncRunner, /markOutboxSynced/);
  assert.match(syncRunner, /markOutboxFailed/);
  assert.match(syncRunner, /break/);
  assert.doesNotMatch(syncRunner, /setInterval|Background|TaskManager|push/i);
  assert.match(outboxHook, /syncNow/);
  assert.match(outboxHook, /Waiting to sync/);
  assert.match(outboxHook, /Could not sync\. Try again\./);
  assert.match(createScreen, /Save as draft/);
  assert.match(createScreen, /chika_thread_create/);
  assert.match(buddiesScreen, /buddy_intent_create/);
  assert.match(chikaDetail, /chika_comment_create/);
});

test("local state does not become canonical server state", () => {
  const localFiles = fs
    .readdirSync(path.join(root, "src/local"), { recursive: true })
    .filter((file) => String(file).endsWith(".ts") || String(file).endsWith(".tsx"))
    .map((file) => read(path.join("src/local", String(file))))
    .join("\n");
  const source = fs
    .readdirSync(path.join(root, "src"), { recursive: true })
    .filter((file) => String(file).endsWith(".ts") || String(file).endsWith(".tsx"))
    .map((file) => read(path.join("src", String(file))))
    .join("\n");

  assert.doesNotMatch(localFiles, /zustand|create\s*\(/i);
  assert.doesNotMatch(localFiles, /CREATE TABLE IF NOT EXISTS (events|messages|profiles|groups|explore_sites)/i);
  assert.doesNotMatch(source, /drizzle-orm|expo-network|BackgroundFetch|TaskManager/i);
});
