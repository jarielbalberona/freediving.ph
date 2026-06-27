import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile profile core uses shared badge and dive identity contracts", () => {
  const api = read("src/features/profiles/api/profiles-api.ts");
  const hooks = read("src/features/profiles/hooks/use-profile-activity-query.ts");
  const keys = read("src/lib/query/query-keys.ts");
  const mutations = read(
    "src/features/profiles/hooks/use-profile-experience-mutations.ts",
  );
  const actionSheet = read("src/components/shell/mobile-action-sheet.tsx");

  for (const contract of [
    "ProfileBadgesResponse",
    "ProfileDiveMapResponse",
    "ProfilePassportResponse",
    "ProfileJourneyResponse",
    "ProfileDiveMemoriesResponse",
    "ProfileDiveMemoriesPageResponse",
  ]) {
    assert.match(api, new RegExp(contract));
  }
  for (const pathPart of [
    "/badges",
    "/dive-map",
    "/passport",
    "/journey",
    "/dive-memories",
    "/v1/me/dive-memories",
    "/v1/me/journey",
    "/v1/me/passport-settings",
  ]) {
    assert.match(api, new RegExp(pathPart));
  }
  assert.match(actionSheet, /ScrollView/);
  assert.match(actionSheet, /MobileThemedBottomSheet/);
  assert.match(
    actionSheet,
    /className=\"w-full border-b border-border\/40 px-4 pb-3\"/,
  );
  assert.match(actionSheet, /contentContainerClassName=\"w-full pb-5 pt-4\"/);
  assert.match(actionSheet, /keyboardVerticalOffset=\{Platform\.OS === \"ios\" \? 16 : 0\}/);
  assert.doesNotMatch(actionSheet, /contentContainerStyle=\{\s*width: sheetWidth\s*\}/);
  assert.match(hooks, /useProfileBadgesQuery/);
  assert.match(hooks, /useProfileDiveMapQuery/);
  assert.match(hooks, /useProfilePassportQuery/);
  assert.match(hooks, /useProfileJourneyQuery/);
  assert.match(hooks, /useProfileDiveMemoriesQuery/);
  assert.match(hooks, /useProfileDiveMemoriesPageQuery/);
  assert.match(keys, /diveMemories/);
  assert.match(keys, /diveMemoriesPage/);
  assert.match(keys, /myDiveMemories/);
  assert.match(mutations, /useCreateDiveMemoryMutation/);
  assert.match(mutations, /useCreateJourneyEntryMutation/);
  assert.match(mutations, /useUpdatePassportSettingsMutation/);
});

test("mobile profile renders canon-aligned tabs without pre-tab identity blocks", () => {
  const ownProfile = read("src/features/profiles/screens/profile-screen.tsx");
  const publicProfile = read("src/features/profiles/screens/public-profile-screen.tsx");
  const summary = read("src/features/profiles/components/profile-dive-identity-summary.tsx");
  const header = read("src/features/profiles/components/profile-header.tsx");
  const badgeSummary = read("src/features/profiles/components/profile-badge-summary-row.tsx");
  const badges = read("src/features/profiles/components/profile-badges-section.tsx");
  const tabs = read("src/features/profiles/components/profile-tabs.tsx");
  const experience = read(
    "src/features/profiles/components/profile-experience-sections.tsx",
  );
  const entryScreen = read(
    "src/features/profiles/screens/profile-dive-memory-entry-screen.tsx",
  );
  const homeRoute = read(
    "app/(app)/(tabs)/(home)/dive-memories/[entrySlug]/[username].tsx",
  );

  assert.doesNotMatch(ownProfile, /ProfileDiveIdentitySummary/);
  assert.doesNotMatch(publicProfile, /ProfileDiveIdentitySummary/);
  assert.doesNotMatch(ownProfile, /Diver details/);
  assert.match(ownProfile, /ProfileBadgesSection/);
  assert.match(publicProfile, /ProfileBadgesSection/);
  assert.match(tabs, /Badges/);
  for (const label of [
    "Posts",
    "Badges",
    "Diving",
    "Dive Memories",
    "Dive Journey",
    "Dive Passport",
  ]) {
    assert.match(tabs, new RegExp(label));
  }
  for (const value of [
    "posts",
    "badges",
    "diving",
    "dive-memories",
    "journey",
    "passport",
  ]) {
    assert.match(tabs, new RegExp(`value: "${value}"`));
  }
  assert.match(tabs, /Ionicons/);
  assert.match(tabs, /accessibilityRole="tab"/);
  assert.match(tabs, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(summary, /Shared memories do not add new visited sites/);
  assert.match(
    summary,
    /visitedSiteCount =\s+passportStats\?\.visitedSiteCount \?\? diveMap\?\.visitedSiteCount \?\? 0;/,
  );
  assert.match(ownProfile, /activeTab === "dive-memories"/);
  assert.match(publicProfile, /activeTab === "dive-memories"/);
  assert.match(ownProfile, /activeTab === "journey"/);
  assert.match(publicProfile, /activeTab === "journey"/);
  assert.match(ownProfile, /activeTab === "passport"/);
  assert.match(publicProfile, /activeTab === "passport"/);
  assert.match(header, /ProfileBadgeSummaryRow/);
  assert.match(header, /badgeCategorySummaries/);
  assert.match(experience, /ProfileDiveMemoriesSection/);
  assert.match(experience, /ProfileJourneySection/);
  assert.match(experience, /ProfilePassportSection/);
  assert.match(experience, /Customize Passport/);
  assert.match(experience, /Add journey note/);
  assert.match(experience, /Show journey highlights/);
  assert.doesNotMatch(experience, /Show journey preview/);
  assert.match(
    publicProfile,
    /onBadgeSummaryPress=\{\(\) => setActiveTab\("badges"\)\}/,
  );
  assert.match(
    ownProfile,
    /onBadgeSummaryPress=\{\(\) => setActiveTab\("badges"\)\}/,
  );
  assert.match(
    ownProfile,
    /badgeCategorySummaries=\{badgesQuery\.data\?\.categorySummaries \?\? \[\]\}/,
  );
  assert.match(
    publicProfile,
    /badgeCategorySummaries=\{badgesQuery\.data\?\.categorySummaries \?\? \[\]\}/,
  );
  assert.match(badgeSummary, /if \(summaries\.length === 0\) \{/);
  assert.match(badgeSummary, /return null;/);
  assert.match(badgeSummary, /testID=\{`badge-summary-/);
  assert.match(badgeSummary, /absolute -top-1 -right-1/);
  assert.match(badgeSummary, /onCategoryPress\(item\.category\)/);
  assert.match(entryScreen, /Media/);
  assert.match(entryScreen, /Posts/);
  assert.match(entryScreen, /Site context/);
  assert.match(entryScreen, /Share memory/);
  assert.doesNotMatch(entryScreen, /Proof/);
  assert.doesNotMatch(entryScreen, /UUID/i);
  assert.match(
    badges,
    /import\s+\{\s*Image\s*\}\s+from\s+\"expo-image\";/,
  );
  assert.match(badges, /ProfileBadgeTile/);
  assert.match(badges, /resolveBadgeImageUrl/);
  assert.match(badges, /groupBadgesByCategory/);
  assert.match(badges, /new URL\(normalizedPath, `\$\{env\.apiBaseUrl\}\/`\)/);
  assert.match(homeRoute, /ProfileDiveMemoryEntryScreen/);
  assert.doesNotMatch(badges, /mutate|POST|PATCH|DELETE/);
});

test("mobile badge tab renders image-first cards with safe fallback", () => {
  const badges = read("src/features/profiles/components/profile-badges-section.tsx");

  assert.match(badges, /type ProfileBadgeTemplateImageSource = \{/);
  assert.match(badges, /const selectBadgeImageSource = \(badge: UserBadge\) =>/);
  assert.match(
    badges,
    /const rawImageUrl = normalizeImageCandidate\(selectBadgeImageSource\(badge\)\);/,
  );
  assert.match(badges, /const imageUrl = resolveBadgeImageUrl\(rawImageUrl\);/);
  assert.match(
    badges,
    /const normalizedPath = trimmed\.startsWith\("\/"\) \? trimmed : `\/\$\{trimmed\}`;/,
  );
  assert.ok(badges.includes("accessibilityLabel={`${badgeName} badge`}"));
  assert.ok(badges.includes("source={{ uri: sourceUrl }}"));
  assert.match(badges, /const fallbackImage = !sourceUrl \|\| imageError \? /);
  assert.match(badges, /template\.badgeImageUrl|badge\.template\.badgeImageUrl/);
  assert.match(
    badges,
    /imageUrl|imagePath|iconUrl|badgeImage|logoPath/,
  );
});

test("own profile edit includes backend-supported identity fields", () => {
  const ownProfile = read("src/features/profiles/screens/profile-screen.tsx");

  assert.match(ownProfile, /homeArea: homeArea\.trim\(\) \|\| undefined/);
  assert.match(ownProfile, /location: homeArea\.trim\(\) \|\| undefined/);
  assert.match(ownProfile, /avatarUrl: avatarUrl\.trim\(\) \|\| undefined/);
  assert.match(ownProfile, /certLevel: certLevelDraft\.trim\(\) \|\| undefined/);
  assert.match(ownProfile, /interests: interests/);
  assert.match(ownProfile, /useLocalDraft<ProfileEditDraft>/);
});
