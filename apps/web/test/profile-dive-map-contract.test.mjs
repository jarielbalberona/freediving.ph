import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("profile dive map UI consumes server contracts and proof APIs", () => {
  const routes = readFileSync("src/lib/api/fphgo-routes.ts", "utf8");
  const api = readFileSync("src/features/profiles/api/profiles.ts", "utf8");
  const component = readFileSync(
    "src/features/profile/components/ProfileDiveMap.tsx",
    "utf8",
  );
  const tabs = readFileSync(
    "src/features/profile/components/ProfileTabs.tsx",
    "utf8",
  );
  const entryPage = readFileSync(
    "src/features/profile/pages/ProfileDiveMapEntryPage.tsx",
    "utf8",
  );
  const entryRoute = readFileSync(
    "src/app/dive-memories/[entrySlug]/[username]/page.tsx",
    "utf8",
  );
  const memories = readFileSync(
    "src/features/profile/components/ProfileDiveMemories.tsx",
    "utf8",
  );

  assert.match(routes, /profileDiveMap:/);
  assert.match(api, /ProfileDiveMapResponse/);
  assert.match(component, /ProfileDiveMapMarker/);
  assert.match(component, /MapProvider/);
  assert.match(component, /from "@vis\.gl\/react-google-maps"/);
  assert.match(component, /markersWithCoordinates/);
  assert.match(component, /PROFILE_MAPS_API_KEY/);
  assert.match(component, /PROFILE_MAP_MARKER_ICON_URL/);
  assert.match(component, /PROFILE_MAP_HEIGHT_CLASS/);
  assert.match(component, /lg:grid-cols-\[minmax\(0,30%\)_minmax\(0,70%\)\]/);
  assert.match(component, /className="hidden lg:flex"/);
  assert.match(
    component,
    /className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-3 lg:hidden"/,
  );
  assert.match(component, /layout="sidebar"/);
  assert.match(component, /layout="overlay"/);
  assert.match(component, /scrollIntoView/);
  assert.match(component, /inline: "center"/);
  assert.match(component, /Map coordinates unavailable/);
  assert.match(component, /Map temporarily unavailable/);
  assert.match(component, /PHILIPPINES_PADDED_BOUNDS/);
  assert.match(component, /PHILIPPINES_MIN_ZOOM/);
  assert.match(component, /PHILIPPINES_ZOOM/);
  assert.match(component, /mapTypeId="terrain"/);
  assert.match(component, /restriction=\{\{/);
  assert.match(component, /aria-pressed=\{active\}/);
  assert.match(component, /marker\.diveSiteName/);
  assert.match(component, /marker\.diveSiteArea/);
  assert.match(component, /View Memories/);
  assert.match(component, /href=\{`\/dive-memories\/\$\{marker\.diveSiteSlug\}\/\$\{username\}`\}/);
  assert.match(component, /MARKER_ICON_SIZE/);
  assert.doesNotMatch(component, /DiveMapSiteDetail/);
  assert.doesNotMatch(component, /useProfileDiveMapSiteQuery/);
  assert.doesNotMatch(
    component,
    /visitedSiteCount.*memories|unlock.*memories|Journey|Passport|Badges/i,
  );
  assert.match(tabs, /<ProfileDiveMap username=\{username\} isOwner=\{isOwner\} \/>/);
  assert.match(entryPage, /useProfileDiveMapSiteQuery/);
  assert.match(entryPage, /mediaPostCount/);
  assert.match(entryPage, /Proof Posts/);
  assert.match(entryPage, /ProfileDiveMemories/);
  assert.match(entryPage, /filterDiveSiteId=\{marker\.diveSiteId\}/);
  assert.match(entryPage, /render={<Link href=\{`\/\$\{normalizedUsername\}\?tab=dive-memories`\} \/>}/);
  assert.match(entryPage, /Back to Dive Memories/);
  assert.match(entryPage, /Dive Memories/);
  assert.match(entryPage, /heading=\{isOwner \? "Add a memory for this dive site" : "Dive Memories"\}/);
  assert.match(entryRoute, /ProfileDiveMapEntryPage/);
  assert.match(entryRoute, /entrySlug/);
  assert.match(memories, /lockedDiveSiteId/);
  assert.match(memories, /Dive site is locked to this memory page\./);
});
