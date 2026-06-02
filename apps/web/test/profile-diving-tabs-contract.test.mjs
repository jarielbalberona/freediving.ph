import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const tabsPath = path.join(
  appRoot,
  "src/features/profile/components/ProfileTabs.tsx",
);
const pagePath = path.join(
  appRoot,
  "src/features/profile/pages/ProfilePage.tsx",
);
const hooksPath = path.join(appRoot, "src/features/profile/hooks/queries.ts");
const profileApiPath = path.join(
  appRoot,
  "src/features/profile/api/profileApi.ts",
);
const profilesApiPath = path.join(
  appRoot,
  "src/features/profiles/api/profiles.ts",
);
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");
const typesPath = path.join(
  cwd.endsWith(path.join("apps", "web"))
    ? path.dirname(path.dirname(appRoot))
    : cwd,
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
  assert.match(tabs, /"dive-memories"/);
  assert.match(tabs, /"dive-journey"/);
  assert.match(tabs, /"dive-passport"/);
  assert.match(tabs, /: "posts"/);
  assert.match(tabs, /profileTabItems/);
  assert.match(tabs, /label: "Posts"/);
  assert.match(tabs, /label: "Badges"/);
  assert.match(tabs, /label: "Diving"/);
  assert.match(tabs, /label: "Dive Memories"/);
  assert.match(tabs, /label: "Dive Journey"/);
  assert.match(tabs, /label: "Dive Passport"/);
  assert.match(tabs, /aria-label=\{label\}/);
  assert.match(tabs, /title=\{label\}/);
  assert.match(tabs, /<Icon aria-hidden="true"/);
  assert.match(tabs, /<span className="sr-only">\{label\}<\/span>/);
  assert.match(tabs, /variant="line"/);
  assert.match(tabs, /border-b border-border\/70/);
  assert.match(tabs, /grid-cols-6/);
  assert.match(tabs, /border-b-2 border-transparent/);
  assert.match(tabs, /after:bg-primary/);
  assert.match(tabs, /data-\[active\]:bg-transparent/);
  assert.match(tabs, /activeTab === value && "border-primary text-foreground"/);
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
  const [page, tabs, badges, map, passport, journey] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(tabsPath, "utf8"),
    readFile(
      path.join(appRoot, "src/features/profile/components/ProfileBadges.tsx"),
      "utf8",
    ),
    readFile(
      path.join(appRoot, "src/features/profile/components/ProfileDiveMap.tsx"),
      "utf8",
    ),
    readFile(
      path.join(appRoot, "src/features/profile/components/ProfilePassport.tsx"),
      "utf8",
    ),
    readFile(
      path.join(appRoot, "src/features/profile/components/ProfileJourney.tsx"),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(page, /<ProfileBadges/);
  assert.match(
    tabs,
    /<ProfileBadges\s+badges=\{badges\}\s+autoStats=\{autoStats\}\s+isOwner=\{isOwner\}\s+\/>/,
  );
  assert.match(
    tabs,
    /<ProfilePassport\s+username=\{username\}\s+isOwner=\{isOwner\}\s+\/>/,
  );
  assert.match(
    tabs,
    /<ProfileDiveMap\s+username=\{username\}\s+isOwner=\{isOwner\}\s+\/>/,
  );
  assert.match(
    tabs,
    /<ProfileJourney\s+username=\{username\}\s+isOwner=\{isOwner\}\s+\/>/,
  );
  assert.match(tabs, /<ProfileTabHeader/);
  assert.match(tabs, /title="Diving"/);
  assert.match(tabs, /subtitle="Presence and dive sites\."/);
  assert.match(tabs, /<TabsContent value="posts" className="px-1">/);
  assert.match(tabs, /<TabsContent value="badges" className="px-2">/);
  assert.match(tabs, /<TabsContent value="diving" className="px-2">/);
  assert.match(tabs, /<TabsContent value="dive-memories" className="px-2">/);
  assert.match(tabs, /<TabsContent value="dive-journey" className="px-2">/);
  assert.match(tabs, /<TabsContent value="dive-passport" className="px-2">/);

  const badgeTabIndex = tabs.indexOf('value="badges"');
  const divingTabIndex = tabs.indexOf('value="diving"');
  const mapTabIndex = tabs.indexOf('value="dive-memories"');
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
  assert.ok(
    mapIndex > -1 && journeyIndex > mapIndex && passportIndex > journeyIndex,
  );

  assert.match(badges, /<ProfileTabHeader/);
  assert.match(badges, /icon={<Award className="h-4 w-4" \/>}/);
  assert.match(badges, /title="Badges & Credentials"/);
  assert.match(
    badges,
    /subtitle="Certifications, experience, community roles, and personal bests\."/,
  );
  assert.match(badges, /isOwner \? \(/);
  assert.match(badges, /href="\/management\/badges"/);
  assert.match(badges, /Manage/);
  assert.match(badges, /badgeCategoryOrder/);
  assert.match(badges, /category: "personal_best", title: "Performance Marks"/);
  assert.match(badges, /category: "certification", title: "Credential Seals"/);
  assert.match(badges, /category: "experience", title: "Field Experience"/);
  assert.match(
    badges,
    /category: "community_role", title: "Leadership Crests"/,
  );
  assert.match(badges, /category: "auto_stat", title: "Explorer Stamps"/);
  assert.ok(
    badges.indexOf('category: "personal_best"') <
      badges.indexOf('category: "certification"') &&
      badges.indexOf('category: "certification"') <
        badges.indexOf('category: "experience"') &&
      badges.indexOf('category: "experience"') <
        badges.indexOf('category: "community_role"') &&
      badges.indexOf('category: "community_role"') <
        badges.indexOf('category: "auto_stat"'),
  );
  assert.match(
    badges,
    /items\.filter\(\(item\) => item\.category === config\.category\)/,
  );
  assert.match(badges, /\.filter\(\(group\) => group\.items\.length > 0\)/);
  assert.match(badges, /<ProfileBadgeCard key=\{item\.id\} item=\{item\} \/>/);
  assert.match(badges, /import Image from "next\/image"/);
  assert.match(badges, /item\.template\.badgeImageUrl/);
  assert.match(badges, /alt=\{`\$\{badgeName\} badge logo`\}/);
  assert.match(badges, /import \{ Badge \} from "@\/components\/ui\/badge"/);
  assert.match(badges, /item\.displayValue \? \(/);
  assert.match(
    badges,
    /<Badge variant="secondary" className="h-5 px-1\.5 text-\[10px\]">/,
  );
  assert.match(badges, /No badges yet/);
  assert.match(
    badges,
    /Badges, credentials, and milestones will appear here\./,
  );
  assert.doesNotMatch(badges, /https:\/\/cdn\.freediving\.ph/);
  assert.match(map, /<ProfileTabHeader/);
  assert.match(map, /title="Dive Memories"/);
  assert.match(
    map,
    /subtitle="Proof-backed visited sites with location-scoped memory pages\."/,
  );
  assert.match(passport, /<ProfileTabHeader/);
  assert.match(passport, /id="profile-passport-heading"/);
  assert.match(passport, /title="Passport"/);
  assert.match(
    passport,
    /subtitle="A compact overview of your dive history and visibility settings\."/,
  );
  assert.match(passport, /isOwner \? \(/);
  assert.match(
    passport,
    /<PassportSettingsPanel\s+username=\{username\}\s+settings=\{passport\.settings\}\s+\/>/,
  );
  assert.match(journey, /<ProfileTabHeader/);
  assert.match(journey, /title="Journey"/);
  assert.match(
    journey,
    /subtitle="Story notes and milestones from your diving path\."/,
  );
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
