import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const tabsPath = path.join(appRoot, "src/features/profile/components/ProfileTabs.tsx");
const pagePath = path.join(appRoot, "src/features/profile/pages/ProfilePage.tsx");
const hooksPath = path.join(appRoot, "src/features/profile/hooks/queries.ts");
const profileApiPath = path.join(appRoot, "src/features/profile/api/profileApi.ts");
const profilesApiPath = path.join(appRoot, "src/features/profiles/api/profiles.ts");
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");
const typesPath = path.join(
  cwd.endsWith(path.join("apps", "web")) ? path.dirname(path.dirname(appRoot)) : cwd,
  "packages/types/src/api/profile-view.ts",
);

test("/[username] profile has the required profile experience tabs with Posts as default", async () => {
  const [page, tabs] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(tabsPath, "utf8"),
  ]);

  assert.match(page, /useProfileDivingQuery\(normalizedUsername\)/);
  assert.match(page, /<ProfileTabs/);
  assert.match(tabs, /"posts"/);
  assert.match(tabs, /"badges"/);
  assert.match(tabs, /"diving"/);
  assert.match(tabs, /"dive-map"/);
  assert.match(tabs, /"dive-journey"/);
  assert.match(tabs, /"dive-passport"/);
  assert.match(tabs, /: "posts"/);
  assert.match(tabs, /<TabsTrigger value="posts">Posts<\/TabsTrigger>/);
  assert.match(tabs, /<TabsTrigger value="badges">Badges<\/TabsTrigger>/);
  assert.match(tabs, /<TabsTrigger value="diving">Diving<\/TabsTrigger>/);
  assert.match(tabs, /<TabsTrigger value="dive-map">Dive Map<\/TabsTrigger>/);
  assert.match(tabs, /<TabsTrigger value="dive-journey">Dive Journey<\/TabsTrigger>/);
  assert.match(tabs, /<TabsTrigger value="dive-passport">Dive Passport<\/TabsTrigger>/);
  assert.match(tabs, /nextParams\.set\("tab", nextTab\)/);
});

test("Posts tab preserves the current profile media grid behavior", async () => {
  const tabs = await readFile(tabsPath, "utf8");

  assert.match(tabs, /function ProfilePostsTab/);
  assert.match(tabs, /<ProfileGrid/);
  assert.match(tabs, /items=\{mediaItems\}/);
  assert.match(tabs, /isLoading=\{isLoadingMedia\}/);
  assert.match(tabs, /hasNextPage=\{hasNextPage\}/);
  assert.match(tabs, /onLoadMore=\{onLoadMore\}/);
});

test("Diving tab renders separate Dive Presence and Dive Sites sections", async () => {
  const tabs = await readFile(tabsPath, "utf8");

  assert.match(tabs, /function ProfileDivingTab/);
  assert.match(tabs, /function ProfileDivePresenceSection/);
  assert.match(tabs, /function ProfileDiveSitesSection/);
  assert.match(tabs, /title="Dive Presence"/);
  assert.match(tabs, /title="Dive Sites"/);
  assert.match(tabs, /presenceLabel\(item\.presenceType\)/);
  assert.match(tabs, /relationshipLabel\(item\.relationship\)/);
  assert.match(tabs, /availabilityLabel\(item\)/);
  assert.match(tabs, /href=\{`\/explore\/sites\/\$\{item\.diveSiteSlug\}`\}/);
  assert.match(tabs, /viewerCanContact/);
});

test("Profile experience modules are routed to separate source-owned tabs", async () => {
  const [page, tabs, passport, journey] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(tabsPath, "utf8"),
    readFile(path.join(appRoot, "src/features/profile/components/ProfilePassport.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/features/profile/components/ProfileJourney.tsx"), "utf8"),
  ]);

  assert.doesNotMatch(page, /<ProfileBadges/);
  assert.match(tabs, /<ProfileBadges badges=\{badges\} autoStats=\{autoStats\} isOwner=\{isOwner\} \/>/);
  assert.match(tabs, /<ProfilePassport username=\{username\} isOwner=\{isOwner\} \/>/);
  assert.match(tabs, /<ProfileDiveMap username=\{username\} isOwner=\{isOwner\} \/>/);
  assert.match(tabs, /<ProfileJourney username=\{username\} isOwner=\{isOwner\} \/>/);

  const badgeTabIndex = tabs.indexOf('value="badges"');
  const divingTabIndex = tabs.indexOf('value="diving"');
  const mapTabIndex = tabs.indexOf('value="dive-map"');
  const journeyTabIndex = tabs.indexOf('value="dive-journey"');
  const passportTabIndex = tabs.indexOf('value="dive-passport"');
  assert.ok(
    badgeTabIndex > -1 &&
      divingTabIndex > badgeTabIndex &&
      mapTabIndex > divingTabIndex &&
      journeyTabIndex > mapTabIndex &&
      passportTabIndex > journeyTabIndex,
  );

  const mapIndex = tabs.indexOf("<ProfileDiveMap");
  const journeyIndex = tabs.indexOf("<ProfileJourney");
  const passportIndex = tabs.indexOf("<ProfilePassport");
  assert.ok(mapIndex > -1 && journeyIndex > mapIndex && passportIndex > journeyIndex);

  assert.match(passport, /isOwner \? \(/);
  assert.match(passport, /<PassportSettingsPanel username=\{username\} settings=\{passport\.settings\} \/>/);
  assert.match(journey, /isOwner \? \(/);
  assert.match(journey, /isOwner && item\.type === "custom"/);
});

test("Diving empty states separate owner CTAs from viewer empty states", async () => {
  const tabs = await readFile(tabsPath, "utf8");

  assert.match(tabs, /You have no active dive presence yet\./);
  assert.match(tabs, /Create dive presence/);
  assert.match(tabs, /\/buddies\?tab=my-dive-presence/);
  assert.match(tabs, /No visible dive presence yet\./);
  assert.match(tabs, /You have not added any dive sites yet\./);
  assert.match(tabs, /Add dive site/);
  assert.match(tabs, /\/buddies\?tab=my-dive-sites/);
  assert.match(tabs, /No visible dive sites yet\./);
});

test("Profile diving API and shared types use profile-scoped Dive Presence shapes", async () => {
  const [hooks, profileApi, profilesApi, routes, types] = await Promise.all([
    readFile(hooksPath, "utf8"),
    readFile(profileApiPath, "utf8"),
    readFile(profilesApiPath, "utf8"),
    readFile(routesPath, "utf8"),
    readFile(typesPath, "utf8"),
  ]);

  assert.match(routes, /\/v1\/profiles\/\$\{toPathId\(username\)\}\/diving/);
  assert.match(routes, /profileDiving/);
  assert.match(routes, /profile:\s*\(/);
  assert.match(profilesApi, /ProfileViewResponse/);
  assert.match(profilesApi, /routes\.v1\.profiles\.profile\(username\)/);
  assert.match(profilesApi, /auth: "none"/);
  assert.match(profilesApi, /getProfileDivingByUsername/);
  assert.match(profilesApi, /auth: "ready-only"/);
  assert.match(profileApi, /getProfileDiving/);
  assert.match(hooks, /useProfileDivingQuery/);
  assert.match(types, /export type ProfileDivingResponse/);
  assert.match(types, /export type ProfileDivePresence/);
  assert.match(types, /export type ProfileDiveSiteAffinity/);
});

test("Profile Diving UI does not use legacy buddy intent or Dive Plans copy", async () => {
  const tabs = await readFile(tabsPath, "utf8");

  assert.doesNotMatch(tabs, /buddy intent/i);
  assert.doesNotMatch(tabs, /buddy_intent/);
  assert.doesNotMatch(tabs, /buddyIntent/);
  assert.doesNotMatch(tabs, /Dive Plans/);
});
