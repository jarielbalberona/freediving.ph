import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const srcRoot = path.join(appRoot, "src");
const sharePagePath = path.join(srcRoot, "app/explore/sites/[slug]/page.tsx");
const shareLoadingPath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/loading.tsx",
);
const suggestEditPagePath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/suggest-edit/page.tsx",
);
const moderationEditPagePath = path.join(
  srcRoot,
  "app/moderation/explore-site-edits/[id]/page.tsx",
);
const relatedTabsPath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/dive-site-related-tabs.tsx",
);
const suggestEditLinkPath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/suggest-edit-link.tsx",
);
const deleteSiteButtonPath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/delete-site-button.tsx",
);
const exploreMapPath = path.join(
  srcRoot,
  "features/explore/components/ExploreMap.tsx",
);
const exploreServerApiPath = path.join(
  srcRoot,
  "features/diveSpots/api/explore-v1.server.ts",
);
const exploreClientApiPath = path.join(
  srcRoot,
  "features/diveSpots/api/explore-v1.ts",
);
const routesPath = path.join(srcRoot, "lib/api/fphgo-routes.ts");

async function readSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return readSourceFiles(entryPath);
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) return [];
      return [entryPath];
    }),
  );

  return files.flat();
}

test("explore site detail renders real backend data or 404s honestly", async () => {
  const [sharePage, suggestEditLink, loadingPage] = await Promise.all([
    readFile(sharePagePath, "utf8"),
    readFile(suggestEditLinkPath, "utf8"),
    readFile(shareLoadingPath, "utf8"),
  ]);

  assert.doesNotMatch(sharePage, /mock-data/);
  assert.doesNotMatch(sharePage, /getMockDiveSpotBySlug/);
  assert.doesNotMatch(sharePage, /Mock explore detail page/);
  assert.match(sharePage, /cache\(/);
  assert.match(sharePage, /getExploreSiteBySlugServer\(slug\)/);
  assert.match(sharePage, /getCachedExploreSiteBySlug\(slug\)/);
  assert.match(sharePage, /export const revalidate = 300/);
  assert.match(sharePage, /getExploreSiteRelatedServer\(slug\)/);
  assert.match(sharePage, /const site = data\.site/);
  assert.match(sharePage, /<SuggestEditLink slug=\{site\.slug\} \/>/);
  assert.match(sharePage, /site\.description/);
  assert.match(sharePage, /site\.typicalConditions/);
  assert.match(sharePage, /site\.contactInfo/);
  assert.match(sharePage, /formatCoordinates\(site\)/);
  assert.match(sharePage, /site\.hazards\.map/);
  assert.doesNotMatch(sharePage, /buttonVariants/);
  assert.match(suggestEditLink, /"use client"/);
  assert.match(suggestEditLink, /Suggest edit/);
  assert.match(suggestEditLink, /\/explore\/sites\/\$\{slug\}\/suggest-edit/);
  assert.match(sharePage, /FphgoFetchError/);
  assert.match(sharePage, /error\.status === 404/);
  assert.match(sharePage, /notFound\(\)/);
  assert.match(sharePage, /throw error/);
  assert.match(loadingPage, /ExploreSiteLoading/);
  assert.doesNotMatch(loadingPage, /"use client"/);
});

test("explore site edits use a separate proposal workflow", async () => {
  const [suggestEditPage, moderationEditPage, routes, clientApi] =
    await Promise.all([
      readFile(suggestEditPagePath, "utf8"),
      readFile(moderationEditPagePath, "utf8"),
      readFile(routesPath, "utf8"),
      readFile(exploreClientApiPath, "utf8"),
    ]);

  assert.match(suggestEditPage, /exploreApi\.createSiteEditProposal\(slug/);
  assert.match(
    suggestEditPage,
    /Suggested edits are reviewed before they change public Explore/,
  );
  assert.match(suggestEditPage, /Super admins apply edits immediately/);
  assert.doesNotMatch(suggestEditPage, /dive_sites/i);
  assert.match(moderationEditPage, /getModerationSiteEditById/);
  assert.match(moderationEditPage, /approveSiteEdit/);
  assert.match(moderationEditPage, /rejectSiteEdit/);
  assert.match(moderationEditPage, /Current/);
  assert.match(moderationEditPage, /Proposed/);
  assert.match(moderationEditPage, /siteChangedSinceProposal/);
  assert.match(moderationEditPage, /changed after the edit was submitted/);
  assert.match(routes, /createSiteEditProposal/);
  assert.match(routes, /moderationPendingSiteEdits/);
  assert.match(routes, /approveSiteEdit/);
  assert.match(routes, /rejectSiteEdit/);
  assert.match(clientApi, /createSiteEditProposal/);
  assert.match(clientApi, /listPendingSiteEdits/);
  assert.match(clientApi, /approveSiteEdit/);
  assert.match(clientApi, /rejectSiteEdit/);
});

test("super admin dive site delete clears Explore list and map state", async () => {
  const [sharePage, deleteButton, exploreMap, routes, clientApi] =
    await Promise.all([
      readFile(sharePagePath, "utf8"),
      readFile(deleteSiteButtonPath, "utf8"),
      readFile(exploreMapPath, "utf8"),
      readFile(routesPath, "utf8"),
      readFile(exploreClientApiPath, "utf8"),
    ]);

  assert.match(sharePage, /<DeleteSiteButton/);
  assert.match(deleteButton, /AlertDialog/);
  assert.doesNotMatch(deleteButton, /window\.confirm/);
  assert.match(deleteButton, /queryKeys\.explore\.lists\(\)/);
  assert.match(deleteButton, /setQueriesData/);
  assert.match(deleteButton, /item\.id !== siteId/);
  assert.match(deleteButton, /invalidateQueries/);
  assert.match(exploreMap, /clustererRef\.current\.clearMarkers\(\)/);
  assert.match(exploreMap, /marker\.map = null/);
  assert.match(exploreMap, /markersRef\.current\.delete\(spotId\)/);
  assert.match(exploreMap, /clustererRef\.current\.render\(\)/);
  assert.match(routes, /deleteSite/);
  assert.match(clientApi, /deleteSite/);
});

test("explore site detail renders related tabs without duplicating old buddy section", async () => {
  const [sharePage, relatedTabs, routes, serverApi, clientApi] =
    await Promise.all([
      readFile(sharePagePath, "utf8"),
      readFile(relatedTabsPath, "utf8"),
      readFile(routesPath, "utf8"),
      readFile(exploreServerApiPath, "utf8"),
      readFile(exploreClientApiPath, "utf8"),
    ]);

  assert.match(sharePage, /<DiveSiteRelatedTabs/);
  assert.doesNotMatch(sharePage, /Find a buddy for this spot/);
  assert.match(sharePage, /getExploreSitePresenceServer\(slug, 6\)/);
  assert.match(sharePage, /getExploreSiteAffinitiesServer\(slug, 6\)/);
  assert.match(
    sharePage,
    /getExploreSiteCommunityPostsServer\(slug, undefined, 6\)/,
  );
  assert.match(sharePage, /getExploreSiteReviewsServer\(slug, 6\)/);
  assert.match(
    sharePage,
    /communityNextCursor=\{communityPostsPage\?\.nextCursor\}/,
  );
  assert.match(
    sharePage,
    /reviews=\{reviewsPage\?\.items \?\? related\?\.previews\.reviews \?\? \[\]\}/,
  );
  assert.match(relatedTabs, /Available Buddies \(\{availableBuddyCount\}\)/);
  assert.match(relatedTabs, /Locals & Regulars \(\{localRegularCount\}\)/);
  assert.match(relatedTabs, /Community Posts \(\{communityPostCount\}\)/);
  assert.match(relatedTabs, /Reviews \(\{visibleReviewCount\}\)/);
  assert.doesNotMatch(relatedTabs, /useRouter/);
  assert.doesNotMatch(relatedTabs, /router\.replace/);
  assert.match(relatedTabs, /useSearchParams/);
  assert.match(
    relatedTabs,
    /const tabFromUrl = tabFromParam\(searchParams\.get\("tab"\)\)/,
  );
  assert.match(relatedTabs, /useState<DiveSiteRelatedTab>\(tabFromUrl\)/);
  assert.match(relatedTabs, /setActiveTabState\(nextTab\)/);
  assert.match(relatedTabs, /nextParams\.set\("tab", nextTab\)/);
  assert.match(relatedTabs, /window\.history\.replaceState/);
  assert.match(relatedTabs, /overflow-x-auto overflow-y-hidden/);
  assert.match(
    relatedTabs,
    /<Tabs value=\{activeTab\} onValueChange=\{setActiveTab\}/,
  );
  assert.match(
    relatedTabs,
    /onClick=\{\(\) => setActiveTab\("available-buddies"\)\}/,
  );
  assert.match(relatedTabs, /onClick=\{\(\) => setActiveTab\("locals"\)\}/);
  assert.match(relatedTabs, /onClick=\{\(\) => setActiveTab\("community"\)\}/);
  assert.match(relatedTabs, /onClick=\{\(\) => setActiveTab\("reviews"\)\}/);
  assert.match(
    relatedTabs,
    /No available buddies yet\. Be the first to mark your dive presence\./,
  );
  assert.match(
    relatedTabs,
    /No locals or regulars yet\. Mark yourself as connected to this site\./,
  );
  assert.match(relatedTabs, /No community posts tagged to this spot yet\./);
  assert.match(
    relatedTabs,
    /No reviews yet\. Be the first to review this dive site\./,
  );
  assert.match(relatedTabs, /<Dialog open=\{presenceDialogOpen\}/);
  assert.match(relatedTabs, /<Dialog open=\{affinityDialogOpen\}/);
  assert.match(relatedTabs, /<Dialog open=\{reviewDialogOpen\}/);
  assert.match(
    relatedTabs,
    /onClick=\{\(\) => setPresenceDialogOpen\(true\)\}/,
  );
  assert.match(
    relatedTabs,
    /onClick=\{\(\) => setAffinityDialogOpen\(true\)\}/,
  );
  assert.match(relatedTabs, /onClick=\{\(\) => setReviewDialogOpen\(true\)\}/);
  assert.match(relatedTabs, /exploreApi\.createSitePresence\(slug/);
  assert.match(relatedTabs, /exploreApi\.createSiteAffinity\(slug/);
  assert.match(relatedTabs, /exploreApi\.createSiteReview\(slug/);
  assert.match(relatedTabs, /activityToHomeFeedItems\(communityFeed\)/);
  assert.match(relatedTabs, /<FeedItemRenderer/);
  assert.match(
    relatedTabs,
    /exploreApi\.getSiteCommunityPosts\(slug, nextCursor\)/,
  );
  assert.match(relatedTabs, /queryKeys\.explore\.siteCommunityPosts\(slug\)/);
  assert.match(relatedTabs, /queryClient\.setQueryData/);
  assert.match(relatedTabs, /existing\.has\(item\.id\)/);
  assert.match(relatedTabs, /nextCursor: page\.nextCursor/);
  assert.match(relatedTabs, /"Load more"/);
  assert.match(routes, /siteRelated/);
  assert.match(routes, /sitePresence/);
  assert.match(routes, /siteAffinities/);
  assert.match(routes, /siteReviews/);
  assert.match(routes, /siteCommunityPosts/);
  assert.match(serverApi, /getExploreSiteRelatedServer/);
  assert.match(serverApi, /fphgoFetchPublicServer/);
  assert.match(serverApi, /getExploreSitePresenceServer/);
  assert.match(serverApi, /getExploreSiteAffinitiesServer/);
  assert.match(serverApi, /getExploreSiteCommunityPostsServer/);
  assert.match(serverApi, /getExploreSiteReviewsServer/);
  assert.match(clientApi, /getSiteCommunityPosts/);
  assert.match(clientApi, /getSiteReviews/);
  assert.match(clientApi, /createSitePresence/);
  assert.match(clientApi, /createSiteAffinity/);
  assert.match(clientApi, /createSiteReview/);
  assert.doesNotMatch(relatedTabs, /location/i);
  assert.doesNotMatch(relatedTabs, /area.*community/i);
});

test("dive presence and affinity forms submit separate payloads", async () => {
  const [relatedTabs, clientApi] = await Promise.all([
    readFile(relatedTabsPath, "utf8"),
    readFile(exploreClientApiPath, "utf8"),
  ]);

  assert.match(relatedTabs, /presenceType: "available"/);
  assert.match(relatedTabs, /flexible: true/);
  assert.match(relatedTabs, /visibility: "members"/);
  assert.match(relatedTabs, /contactEnabled: true/);
  assert.match(relatedTabs, /relationship: "regular"/);
  assert.match(relatedTabs, /contactEnabled: false/);
  assert.match(relatedTabs, /rfc3339FromLocal\(presenceForm\.startAt/);
  assert.match(relatedTabs, /DatePicker/);
  assert.doesNotMatch(relatedTabs, /type="datetime-local"/);
  assert.match(
    clientApi,
    /createSitePresence: \(slug: string, payload: CreateDivePresenceRequest\)/,
  );
  assert.match(
    clientApi,
    /createSiteAffinity: \(slug: string, payload: CreateDiveSiteAffinityRequest\)/,
  );
});

test("launch source does not import seeded Explore mock data", async () => {
  const sourceFiles = await readSourceFiles(srcRoot);
  const matches = [];

  for (const sourcePath of sourceFiles) {
    const source = await readFile(sourcePath, "utf8");
    if (
      /MOCK_EXPLORE_SPOTS|getMockDiveSpotBySlug|features\/explore\/mock-data/.test(
        source,
      )
    ) {
      matches.push(path.relative(appRoot, sourcePath));
    }
  }

  assert.deepEqual(matches, []);
});
