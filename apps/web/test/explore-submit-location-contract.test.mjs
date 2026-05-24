import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

const submitPagePath = path.join(appRoot, "src/app/explore/submit/page.tsx");
const dialogPath = path.join(
  appRoot,
  "src/app/explore/submit/map-pin-picker-dialog.tsx",
);
const schemaPath = path.join(
  appRoot,
  "src/features/diveSpots/schemas/siteSubmission.schema.ts",
);

test("explore submit flow stores map-picked location and does not expose manual area or coordinate inputs", async () => {
  const [pageSource, dialogSource, schemaSource] = await Promise.all([
    readFile(submitPagePath, "utf8"),
    readFile(dialogPath, "utf8"),
    readFile(schemaPath, "utf8"),
  ]);

  assert.match(schemaSource, /location:\s*locationSchema\.nullable\(\)/);
  assert.match(schemaSource, /description:\s*z/);
  assert.match(schemaSource, /Pick the dive spot on the map before submitting/);
  assert.match(schemaSource, /siteSubmissionLimits\s*=\s*\{/);
  assert.match(schemaSource, /name:\s*\{\s*min:\s*3,\s*max:\s*120\s*\}/);
  assert.match(
    schemaSource,
    /description:\s*\{\s*min:\s*12,\s*max:\s*2000\s*\}/,
  );
  assert.match(schemaSource, /hazard:\s*\{\s*max:\s*60\s*\}/);
  assert.match(schemaSource, /bestSeason:\s*\{\s*max:\s*160\s*\}/);
  assert.match(schemaSource, /typicalConditions:\s*\{\s*max:\s*500\s*\}/);
  assert.match(schemaSource, /access:\s*\{\s*max:\s*500\s*\}/);
  assert.match(schemaSource, /fees:\s*\{\s*max:\s*280\s*\}/);
  assert.match(schemaSource, /depthM:\s*\{\s*min:\s*0,\s*max:\s*2000\s*\}/);
  assert.match(schemaSource, /Each hazard must be at most/);
  assert.match(schemaSource, /Depth must be between 0 and 2000 meters/);

  assert.match(pageSource, /Dive spot location/);
  assert.match(pageSource, /Description/);
  assert.match(pageSource, /Mark on map/);
  assert.match(pageSource, /aria-label="Edit pin"/);
  assert.match(pageSource, /siteSubmissionLimits/);
  assert.match(pageSource, /maxLength=\{siteSubmissionLimits\.name\.max\}/);
  assert.match(
    pageSource,
    /maxLength=\{siteSubmissionLimits\.description\.max\}/,
  );
  assert.match(pageSource, /siteSubmissionLimits\.hazard\.max/);
  assert.match(
    pageSource,
    /maxLength=\{siteSubmissionLimits\.bestSeason\.max\}/,
  );
  assert.match(pageSource, /siteSubmissionLimits\.typicalConditions\.max/);
  assert.match(pageSource, /maxLength=\{siteSubmissionLimits\.access\.max\}/);
  assert.match(pageSource, /maxLength=\{siteSubmissionLimits\.fees\.max\}/);
  assert.match(pageSource, /description:\s*values\.description\.trim\(\)/);
  assert.match(pageSource, /lat:\s*values\.location\.lat/);
  assert.match(pageSource, /lng:\s*values\.location\.lng/);
  assert.match(
    pageSource,
    /area:\s*values\.location\.area\?\.trim\(\)\s*\|\|\s*undefined/,
  );
  assert.doesNotMatch(pageSource, /name="area"/);
  assert.doesNotMatch(pageSource, /name="latitude"/);
  assert.doesNotMatch(pageSource, /name="longitude"/);
  assert.doesNotMatch(pageSource, /name="contactInfo"/);

  assert.match(dialogSource, /Pin the dive site/);
  assert.match(dialogSource, /Search for a place or area/);
  assert.match(dialogSource, /geocode\(\{\s*address:\s*query/);
  assert.match(
    dialogSource,
    /componentRestrictions:\s*\{\s*country:\s*"PH"\s*\}/,
  );
  assert.match(dialogSource, /selectSearchResult/);
  assert.match(dialogSource, /mapRef\.current\?\.panTo\(latLng\)/);
  assert.match(dialogSource, /mapRef\.current\?\.setZoom\(13\)/);
  assert.match(dialogSource, /Confirm pin/);
  assert.match(dialogSource, /AdvancedMarker/);
  assert.match(dialogSource, /mapId=\{SUBMIT_GOOGLE_MAP_ID\}/);
  assert.doesNotMatch(dialogSource, /<Marker\b/);
  assert.doesNotMatch(dialogSource, /center=\{initialCenter\}/);
  assert.match(dialogSource, /draggable/);
  assert.match(dialogSource, /onClick=\{\(event\) =>/);
  assert.match(
    dialogSource,
    /className="flex! h-dvh w-dvw max-w-none! flex-col gap-0 overflow-hidden rounded-none border-0 p-0/,
  );
  assert.match(dialogSource, /containerClassName="p-0 sm:p-4"/);
  assert.match(
    dialogSource,
    /className="relative min-h-0 flex-1 bg-sky-950\/5"/,
  );
});
