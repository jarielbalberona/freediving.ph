import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const exploreStorePath = path.join(repoRoot, "src/features/diveSpots/store/exploreStore.ts");
const exploreUrlStatePath = path.join(repoRoot, "src/features/diveSpots/hooks/useExploreUrlState.ts");
const exploreViewPath = path.join(repoRoot, "src/app/explore/explore-view.tsx");
const mapContainerPath = path.join(repoRoot, "src/app/explore/maps/map-container.tsx");
const detailSheetPath = path.join(repoRoot, "src/app/explore/dive-spot-detail-sheet.tsx");
const diveSpotApiPath = path.join(repoRoot, "src/features/diveSpots/api/diveSpots.ts");

test("phase 2 introduces centralized explore store and URL sync hook", async () => {
  const storeSource = await readFile(exploreStorePath, "utf8");
  const urlStateSource = await readFile(exploreUrlStatePath, "utf8");
  const exploreViewSource = await readFile(exploreViewPath, "utf8");

  assert.match(storeSource, /type ExploreViewMode = "map" \| "list"/);
  assert.match(storeSource, /selectedSpotId/);
  assert.match(urlStateSource, /useSearchParams/);
  assert.match(urlStateSource, /router\.replace/);
  assert.match(exploreViewSource, /useExploreUrlState\(\)/);
  assert.match(exploreViewSource, /useDiveSpotsMapQuery/);
  assert.match(exploreViewSource, /useDiveSpotsListQuery/);
});

test("phase 3 hardens map marker rendering for high-density payloads", async () => {
  const source = await readFile(mapContainerPath, "utf8");

  assert.match(source, /getMarkerLimit/);
  assert.match(source, /spots\.length <= markerLimit/);
  assert.match(source, /label=\{spot\.id === selectedSpotId \? "★" : undefined\}/);
});

test("phase 4 and 5 wire detail sheet and review APIs", async () => {
  const detailSource = await readFile(detailSheetPath, "utf8");
  const apiSource = await readFile(diveSpotApiPath, "utf8");

  assert.match(detailSource, /Dive Spot Details/);
  assert.match(detailSource, /useDiveSpotReviewSummary/);
  assert.match(detailSource, /useCreateDiveSpotReview/);

  assert.match(apiSource, /\/reviews\/summary/);
  assert.match(apiSource, /createDiveSpotReview: async \(diveSpotId: number/);
});
