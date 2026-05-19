import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

const explorePagePath = path.join(appRoot, "src/app/explore/page.tsx");
const exploreLayoutPath = path.join(
  appRoot,
  "src/features/explore/components/ExploreLayout.tsx",
);
const sharePagePath = path.join(
  appRoot,
  "src/app/explore/sites/[slug]/page.tsx",
);
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");

test("explore site pages are coupled to related tabs and full buddy intent flows", async () => {
  const [explorePage, exploreLayout, sharePage, routes] = await Promise.all([
    readFile(explorePagePath, "utf8"),
    readFile(exploreLayoutPath, "utf8"),
    readFile(sharePagePath, "utf8"),
    readFile(routesPath, "utf8"),
  ]);

  assert.match(routes, /siteBuddyPreview/);
  assert.match(routes, /siteBuddyIntents/);
  assert.match(routes, /siteRelated/);

  assert.match(explorePage, /ExploreLayout/);
  assert.match(exploreLayout, /exploreApi\.searchDiveSpots/);
  assert.match(exploreLayout, /exploreWriteApi\.saveSite/);
  assert.match(exploreLayout, /exploreWriteApi\.unsaveSite/);
  assert.match(exploreLayout, /getDiveSpotSlug/);
  assert.match(exploreLayout, /Open site/);

  assert.match(sharePage, /getExploreSiteRelatedServer/);
  assert.match(sharePage, /<DiveSiteRelatedTabs/);
  assert.doesNotMatch(sharePage, /Find a buddy for this spot/);
});
