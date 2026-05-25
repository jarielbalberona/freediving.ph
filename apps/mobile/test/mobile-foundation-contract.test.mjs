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
  assert.ok(!pkg.dependencies["expo-sqlite"]);
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

test("explore uses shared contracts and safe mobile routes", () => {
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
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.doesNotMatch(detail, /bookmark|gps/i);
  assert.ok(format.includes('includes("/")'));
});

test("chika uses shared contracts and read-only mobile routes", () => {
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
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.match(card, /safeChikaSlug/);
  assert.match(format, /authorDisplayName/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.doesNotMatch(detail, /createComment|setReaction|websocket|realtime/i);
  assert.ok(format.includes('includes("/")'));
});

test("events uses shared contracts and read-only mobile routes", () => {
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
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.match(card, /safeEventSlug/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.doesNotMatch(detail, /joinEvent|rsvp|booking|checkIn|receipt/i);
  assert.ok(format.includes('includes("/")'));
});

test("profiles use shared contracts, auth gating, and read-only routes", () => {
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
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.match(myHook, /useAuthenticatedFphgoQuery/);
  assert.doesNotMatch(publicHook, /useAuthenticatedFphgoQuery/);
  assert.match(publicHook, /useQuery/);
  assert.match(publicHook, /safeProfileUsername/);
  assert.match(ownScreen, /\/\(app\)\/\(tabs\)\/profile\/settings/);
  assert.match(publicScreen, /useLocalSearchParams/);
  assert.doesNotMatch(
    ownScreen,
    /upload|editProfile|followAction|sendMessage|SQLite|Drizzle/i,
  );
  assert.doesNotMatch(
    publicScreen,
    /upload|editProfile|followAction|sendMessage|report|block/i,
  );
  assert.ok(format.includes('includes("/")'));
});

test("notifications use shared contracts, auth gating, and read-only routes", () => {
  const api = read("src/features/notifications/api/notifications-api.ts");
  const hook = read(
    "src/features/notifications/hooks/use-notifications-query.ts",
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
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/notifications/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/notifications\/types/);
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.match(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.notifications\.list/);
  assert.match(card, /notificationHref/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(format, /\/\(app\)\/\(tabs\)\/profile\/\[username\]/);
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.doesNotMatch(
    screen,
    /markAsRead|markAllAsRead|pushToken|websocket|realtime/i,
  );
});

test("buddies use shared public preview contracts and read-only routes", () => {
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
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.doesNotMatch(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.buddies\.preview/);
  assert.match(card, /BuddyFinderPreviewIntent/);
  assert.doesNotMatch(card, /Link|Pressable|buddyProfileHref/);
  assert.ok(format.includes('includes("/")'));
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.doesNotMatch(
    screen,
    /createIntent|deleteIntent|messageEntry|sendRequest|gps|location/i,
  );
});
