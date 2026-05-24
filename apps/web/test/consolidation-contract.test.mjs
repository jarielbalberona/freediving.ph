import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const repoRoot = path.resolve(appRoot, "../..");

const readApp = (relativePath) =>
  readFile(path.join(appRoot, relativePath), "utf8");
const readRepo = (relativePath) =>
  readFile(path.join(repoRoot, relativePath), "utf8");

test("fake breadth pages are parked instead of calling unsupported APIs", async () => {
  const parkedPage = await readApp(
    "src/components/product/parked-feature-page.tsx",
  );
  assert.match(parkedPage, /Parked for launch/);
  assert.match(
    parkedPage,
    /focuses on the community features that are open and useful today/,
  );

  for (const route of [
    "training-logs",
    "marketplace",
    "competitive-records",
    "safety",
    "services",
    "collaboration",
    "awareness",
  ]) {
    const source = await readApp(`src/app/${route}/page.tsx`);
    assert.match(source, /ParkedFeaturePage/);
    assert.match(source, /robots: \{ index: false, follow: false \}/);
    assert.doesNotMatch(source, /use[A-Z][A-Za-z]+/);
    assert.doesNotMatch(source, /axiosInstance|fphgoFetchClient/);
    assert.doesNotMatch(source, /backend|fphgo|API|contract/);
  }
});

test("parked routes render their pages instead of proxy redirects", async () => {
  const proxy = await readApp("src/proxy.ts");

  assert.doesNotMatch(proxy, /COMING_SOON_PREFIXES/);
  assert.doesNotMatch(proxy, /NextResponse\.redirect/);
  assert.match(proxy, /"\/media\(\.\*\)"/);
  assert.doesNotMatch(proxy, /"\/services\(\.\*\)"/);
});

test("admin and moderation have unified operator landing surfaces", async () => {
  const [adminPage, moderationPage, sidebar] = await Promise.all([
    readApp("src/app/admin/page.tsx"),
    readApp("src/app/moderation/page.tsx"),
    readApp("src/components/ui/app-sidebar.tsx"),
  ]);

  assert.match(adminPage, /Admin Overview/);
  assert.match(adminPage, /\/moderation/);
  assert.match(adminPage, /\/admin\/groups/);
  assert.match(moderationPage, /reports\.read/);
  assert.match(moderationPage, /explore\.moderate/);
  assert.match(moderationPage, /moderation\.write/);
  assert.match(sidebar, /canViewModeration/);
  assert.match(sidebar, /session\.hasPermission\("reports\.read"\)/);
});

test("frontend permission gates use backend permission names", async () => {
  const [reportsList, reportsDetail, config, backendAuthz] = await Promise.all([
    readApp("src/app/moderation/reports/page.tsx"),
    readApp("src/app/moderation/reports/[reportId]/page.tsx"),
    readRepo("packages/config/src/rbac/permissions.ts"),
    readRepo("services/fphgo/internal/shared/authz/authz.go"),
  ]);

  assert.match(reportsList, /perm="reports\.read"/);
  assert.match(reportsDetail, /perm="reports\.read"/);
  assert.match(reportsDetail, /hasPermission\("reports\.moderate"\)/);
  assert.match(reportsDetail, /hasPermission\("moderation\.write"\)/);
  assert.match(config, /"reports\.read"/);
  assert.match(config, /"reports\.moderate"/);
  assert.doesNotMatch(config, /reports\.review/);
  assert.match(backendAuthz, /case "member", "trusted_member":/);
  assert.match(backendAuthz, /case "explore_curator":/);
});

test("media is exposed consistently only to signed-in users", async () => {
  const [nav, guard] = await Promise.all([
    readApp("src/config/nav.ts"),
    readApp("src/components/auth/guard.tsx"),
  ]);

  assert.match(nav, /id: "media"[\s\S]*?isProtected: true/);
  assert.match(nav, /MOBILE_SIDEBAR_ORDER[\s\S]*?"media"/);
  assert.match(guard, /role === "support"/);
});

test("product analytics tracks only activation events through gtag", async () => {
  const [
    analytics,
    events,
    groups,
    chika,
    media,
    messages,
    schools,
    instructors,
    profile,
    explore,
    submitDiveSite,
  ] = await Promise.all([
    readApp("src/lib/analytics/product-events.ts"),
    readApp("src/features/events/hooks/mutations.ts"),
    readApp("src/features/groups/hooks/mutations.ts"),
    readApp("src/features/chika/hooks/mutations.ts"),
    readApp("src/features/media/hooks/mutations.ts"),
    readApp("src/features/messages/hooks/mutations.ts"),
    readApp("src/features/schools/hooks/mutations.ts"),
    readApp("src/features/instructors/hooks/mutations.ts"),
    readApp("src/features/profiles/hooks/mutations.ts"),
    readApp("src/features/explore/components/ExploreLayout.tsx"),
    readApp("src/app/explore/submit/page.tsx"),
  ]);

  assert.match(analytics, /PRODUCT_EVENT_NAMES/);
  assert.match(analytics, /SENSITIVE_PARAM_PATTERN/);
  assert.match(analytics, /window\.gtag\?\("event", eventName/);
  assert.match(events, /trackProductEvent\("event_joined"\)/);
  assert.match(events, /trackProductEvent\("event_interested"\)/);
  assert.match(groups, /useJoinGroup[\s\S]*trackProductEvent\("group_joined"\)/);
  assert.doesNotMatch(
    groups,
    /useUpdateGroup[\s\S]*trackProductEvent\("group_joined"\)[\s\S]*useJoinGroup/,
  );
  assert.match(chika, /trackProductEvent\("chika_thread_created"\)/);
  assert.match(media, /trackProductEvent\("media_posted"\)/);
  assert.match(messages, /trackProductEvent\("message_sent"\)/);
  assert.match(schools, /trackProductEvent\("course_booked"\)/);
  assert.match(
    instructors,
    /trackProductEvent\("instructor_application_submitted"\)/,
  );
  assert.match(profile, /trackProductEvent\("profile_completed"\)/);
  assert.match(explore, /trackProductEvent\("dive_spot_saved"\)/);
  assert.match(submitDiveSite, /trackProductEvent\("dive_spot_submitted"\)/);
});
