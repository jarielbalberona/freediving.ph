import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());

const explorePagePath = path.join(appRoot, "src/app/explore/page.tsx");
const exploreLayoutPath = path.join(
  appRoot,
  "src/features/explore/components/ExploreLayout.tsx",
);
const exploreMapPath = path.join(
  appRoot,
  "src/features/explore/components/ExploreMap.tsx",
);
const exploreApiPath = path.join(
  appRoot,
  "src/features/explore/api/exploreApi.ts",
);
const exploreV1ApiPath = path.join(
  appRoot,
  "src/features/diveSpots/api/explore-v1.ts",
);

test("live explore route renders the feature layout, not legacy app-local files", async () => {
  const pageSource = await readFile(explorePagePath, "utf8");

  assert.match(pageSource, /ExploreLayout/);
  assert.doesNotMatch(pageSource, /explore-view/);
  assert.doesNotMatch(pageSource, /dive-spots-container/);
});

test("explore adapter preserves backend card facts and supported filters", async () => {
  const [apiSource, v1Source] = await Promise.all([
    readFile(exploreApiPath, "utf8"),
    readFile(exploreV1ApiPath, "utf8"),
  ]);

  assert.match(apiSource, /depthMinM: site\.depthMinM/);
  assert.match(apiSource, /depthMaxM: site\.depthMaxM/);
  assert.match(apiSource, /hazards: site\.hazards/);
  assert.match(apiSource, /area: params\.area/);
  assert.match(apiSource, /difficulty: params\.difficulty/);
  assert.match(apiSource, /verifiedOnly: params\.verifiedOnly/);
  assert.match(apiSource, /north: bounds\?\.ne\.lat/);
  assert.match(apiSource, /south: bounds\?\.sw\.lat/);
  assert.match(apiSource, /east: bounds\?\.ne\.lng/);
  assert.match(apiSource, /west: bounds\?\.sw\.lng/);
  assert.doesNotMatch(apiSource, /isWithinBounds/);
  assert.match(v1Source, /north\?: number/);
  assert.match(v1Source, /south\?: number/);
  assert.match(v1Source, /east\?: number/);
  assert.match(v1Source, /west\?: number/);
  assert.match(v1Source, /north: filters\.north/);
});

test("live explore layout wires filters, map selection, and selected preview", async () => {
  const layoutSource = await readFile(exploreLayoutPath, "utf8");
  const mapSource = await readFile(exploreMapPath, "utf8");

  assert.match(layoutSource, /setArea/);
  assert.match(layoutSource, /setDifficulty/);
  assert.match(layoutSource, /setVerifiedOnly/);
  assert.match(layoutSource, /bounds: state\.bounds/);
  assert.match(layoutSource, /areaOptions/);
  assert.match(layoutSource, /selectedSpot/);
  assert.match(layoutSource, /Open site/);

  assert.match(mapSource, /MarkerClusterer/);
  assert.match(mapSource, /onSelectSpot\(spot\)/);
  assert.match(mapSource, /scaledSize: isSelected/);
  assert.match(mapSource, /map\.panTo\(position\)/);
});
