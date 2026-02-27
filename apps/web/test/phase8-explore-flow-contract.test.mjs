import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const exploreViewPath = path.join(repoRoot, "src/app/explore/explore-view.tsx");
const detailSheetPath = path.join(repoRoot, "src/app/explore/dive-spot-detail-sheet.tsx");
const mutationsPath = path.join(repoRoot, "src/features/diveSpots/hooks/mutations.ts");
const urlStatePath = path.join(repoRoot, "src/features/diveSpots/hooks/useExploreUrlState.ts");

test("phase 8 integrates URL state, selected spot, detail sheet, and review write-through", async () => {
  const exploreView = await readFile(exploreViewPath, "utf8");
  const detailSheet = await readFile(detailSheetPath, "utf8");
  const mutations = await readFile(mutationsPath, "utf8");
  const urlState = await readFile(urlStatePath, "utf8");

  assert.match(urlState, /spotId/);
  assert.match(urlState, /router\.replace/);
  assert.match(exploreView, /DiveSpotDetailSheet/);
  assert.match(exploreView, /spotId=\{selectedSpotId\}/);
  assert.match(detailSheet, /useDiveSpot\(/);
  assert.match(detailSheet, /useDiveSpotReviews\(/);
  assert.match(detailSheet, /createReview\.mutate/);
  assert.match(mutations, /queryKey: \['dive-spot-review-summary', variables\.diveSpotId\]/);
  assert.match(mutations, /queryKey: \['dive-spots'\]/);
});
