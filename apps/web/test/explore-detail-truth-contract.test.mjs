import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web")) ? cwd : path.join(cwd, "apps", "web");
const srcRoot = path.join(appRoot, "src");
const sharePagePath = path.join(srcRoot, "app/explore/sites/[slug]/page.tsx");
const relatedTabsPath = path.join(
  srcRoot,
  "app/explore/sites/[slug]/dive-site-related-tabs.tsx",
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
  const sharePage = await readFile(sharePagePath, "utf8");

  assert.doesNotMatch(sharePage, /mock-data/);
  assert.doesNotMatch(sharePage, /getMockDiveSpotBySlug/);
  assert.doesNotMatch(sharePage, /Mock explore detail page/);
  assert.match(sharePage, /getExploreSiteBySlugServer\(slug\)/);
  assert.match(sharePage, /getExploreSiteRelatedServer\(slug\)/);
  assert.match(sharePage, /notFound\(\)/);
});

test("explore site detail renders related tabs without duplicating old buddy section", async () => {
  const [sharePage, relatedTabs, routes, serverApi, clientApi] = await Promise.all([
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
  assert.match(sharePage, /getExploreSiteCommunityPostsServer\(slug, undefined, 6\)/);
  assert.match(sharePage, /getExploreSiteReviewsServer\(slug, 6\)/);
  assert.match(sharePage, /communityNextCursor=\{communityPostsPage\?\.nextCursor\}/);
  assert.match(sharePage, /reviews=\{reviewsPage\?\.items \?\? related\?\.previews\.reviews \?\? \[\]\}/);
  assert.match(relatedTabs, /Available Buddies \(\{availableBuddyCount\}\)/);
  assert.match(relatedTabs, /Locals & Regulars \(\{localRegularCount\}\)/);
  assert.match(relatedTabs, /Community Posts \(\{communityPostCount\}\)/);
  assert.match(relatedTabs, /Reviews \(\{visibleReviewCount\}\)/);
  assert.match(relatedTabs, /No available buddies yet\. Be the first to mark your dive presence\./);
  assert.match(relatedTabs, /No locals or regulars yet\. Mark yourself as connected to this site\./);
  assert.match(relatedTabs, /No community posts tagged to this spot yet\./);
  assert.match(relatedTabs, /No reviews yet\. Be the first to review this dive site\./);
  assert.match(relatedTabs, /<Dialog open=\{presenceDialogOpen\}/);
  assert.match(relatedTabs, /<Dialog open=\{affinityDialogOpen\}/);
  assert.match(relatedTabs, /<Dialog open=\{reviewDialogOpen\}/);
  assert.match(relatedTabs, /onClick=\{\(\) => setPresenceDialogOpen\(true\)\}/);
  assert.match(relatedTabs, /onClick=\{\(\) => setAffinityDialogOpen\(true\)\}/);
  assert.match(relatedTabs, /onClick=\{\(\) => setReviewDialogOpen\(true\)\}/);
  assert.match(relatedTabs, /exploreApi\.createSitePresence\(slug/);
  assert.match(relatedTabs, /exploreApi\.createSiteAffinity\(slug/);
  assert.match(relatedTabs, /exploreApi\.createSiteReview\(slug/);
  assert.match(relatedTabs, /activityToHomeFeedItems\(communityFeed\)/);
  assert.match(relatedTabs, /<FeedItemRenderer/);
  assert.match(relatedTabs, /exploreApi\.getSiteCommunityPosts\(slug, nextCursor\)/);
  assert.match(relatedTabs, /setCommunityFeed/);
  assert.match(relatedTabs, /existing\.has\(item\.id\)/);
  assert.match(relatedTabs, /setNextCursor\(page\.nextCursor\)/);
  assert.match(relatedTabs, /"Load more"/);
  assert.match(routes, /siteRelated/);
  assert.match(routes, /sitePresence/);
  assert.match(routes, /siteAffinities/);
  assert.match(routes, /siteReviews/);
  assert.match(routes, /siteCommunityPosts/);
  assert.match(serverApi, /getExploreSiteRelatedServer/);
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
  assert.match(clientApi, /createSitePresence: \(slug: string, payload: CreateDivePresenceRequest\)/);
  assert.match(clientApi, /createSiteAffinity: \(slug: string, payload: CreateDiveSiteAffinityRequest\)/);
});

test("launch source does not import seeded Explore mock data", async () => {
  const sourceFiles = await readSourceFiles(srcRoot);
  const matches = [];

  for (const sourcePath of sourceFiles) {
    const source = await readFile(sourcePath, "utf8");
    if (/MOCK_EXPLORE_SPOTS|getMockDiveSpotBySlug|features\/explore\/mock-data/.test(source)) {
      matches.push(path.relative(appRoot, sourcePath));
    }
  }

  assert.deepEqual(matches, []);
});
