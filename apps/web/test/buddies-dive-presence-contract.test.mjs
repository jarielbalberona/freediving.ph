import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const pagePath = path.join(appRoot, "src/app/buddies/page.tsx");
const exploreApiPath = path.join(appRoot, "src/features/diveSpots/api/explore-v1.ts");
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");

test("/buddies is the Dive Presence discovery and management surface", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /Find Buddies/);
  assert.match(page, /My Dive Presence/);
  assert.match(page, /My Dive Sites/);
  assert.match(page, /exploreApi\.getGlobalPresences/);
  assert.match(page, /exploreApi\.getMyDivePresences/);
  assert.match(page, /exploreApi\.getMyDiveSiteAffinities/);
  assert.match(page, /exploreApi\.createSitePresence/);
  assert.match(page, /exploreApi\.updateSitePresence/);
  assert.match(page, /exploreApi\.cancelSitePresence/);
  assert.match(page, /exploreApi\.createSiteAffinity/);
  assert.match(page, /exploreApi\.updateSiteAffinity/);
  assert.match(page, /exploreApi\.deleteSiteAffinity/);
  assert.match(page, /No available buddies found/);
  assert.match(page, /Try another dive site or mark your own Dive Presence\./);
  assert.match(page, /Available Buddies come from active Dive Presence only/);
  assert.match(page, /long-term dive-site relationships and do not imply availability/);
  assert.match(page, /onClick=\{\(\) => setActiveTab\("presence"\)\}/);
  assert.match(page, /value=\{activeTab\}/);
  assert.match(page, /tabFromParam\(searchParams\.get\("tab"\)\)/);
  assert.match(page, /value === "presence" \|\| value === "my-dive-presence"/);
  assert.match(page, /value === "sites" \|\| value === "my-dive-sites"/);
});

test("/buddies creates dive-site-backed presence and affinity payloads", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /siteSlug: ""/);
  assert.match(page, /presenceType: "available"/);
  assert.match(page, /relationship: "regular"/);
  assert.match(page, /presencePayload\(draft\)/);
  assert.match(page, /affinityPayload\(draft\)/);
  assert.match(page, /startAt: draft\.flexible/);
  assert.match(page, /endAt: draft\.flexible/);
  assert.match(page, /contactEnabled: draft\.contactEnabled/);
  assert.match(page, /visibility: draft\.visibility/);
});

test("/buddies does not use the legacy buddy intent API", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.doesNotMatch(page, /buddyFinderApi/);
  assert.doesNotMatch(page, /buddy-finder/);
  assert.doesNotMatch(page, /buddy_intent/);
  assert.doesNotMatch(page, /buddyIntent/);
  assert.doesNotMatch(page, /createIntent/);
});

test("Dive Presence APIs expose global and current-user endpoints", async () => {
  const [api, routes] = await Promise.all([
    readFile(exploreApiPath, "utf8"),
    readFile(routesPath, "utf8"),
  ]);

  assert.match(routes, /globalPresences: \(\) => "\/v1\/explore\/presences"/);
  assert.match(routes, /myDivePresences: \(\) => "\/v1\/explore\/me\/dive-presences"/);
  assert.match(routes, /myDiveSiteAffinities: \(\) => "\/v1\/explore\/me\/dive-site-affinities"/);
  assert.match(api, /getGlobalPresences/);
  assert.match(api, /getMyDivePresences/);
  assert.match(api, /getMyDiveSiteAffinities/);
});
