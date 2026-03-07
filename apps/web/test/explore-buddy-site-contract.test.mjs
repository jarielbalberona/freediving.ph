import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web")) ? cwd : path.join(cwd, "apps", "web");

const explorePagePath = path.join(appRoot, "src/app/explore/page.tsx");
const sharePagePath = path.join(appRoot, "src/app/explore/sites/[slug]/page.tsx");
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");

test("explore site pages are coupled to buddy preview and full intent flows", async () => {
  const [explorePage, sharePage, routes] = await Promise.all([
    readFile(explorePagePath, "utf8"),
    readFile(sharePagePath, "utf8"),
    readFile(routesPath, "utf8"),
  ]);

  assert.match(routes, /siteBuddyPreview/);
  assert.match(routes, /siteBuddyIntents/);

  assert.match(explorePage, /Find a buddy for this spot/);
  assert.match(explorePage, /getSiteBuddyPreview/);
  assert.match(explorePage, /getSiteBuddyIntents/);
  assert.match(explorePage, /messagesApi\.createRequest/);
  assert.match(explorePage, /diveSiteId: selectedSite\.id/);
  assert.match(explorePage, /Post intent for this site/);

  assert.match(sharePage, /getExploreSiteBuddyPreviewServer/);
  assert.match(sharePage, /Find a buddy for this spot/);
});
