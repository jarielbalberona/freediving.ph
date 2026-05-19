import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());

const queryStatePath = path.join(
  appRoot,
  "src/features/explore/hooks/useExploreQueryState.ts",
);
const resultsPanelPath = path.join(
  appRoot,
  "src/features/explore/components/ExploreResultsPanel.tsx",
);
const diveSpotCardPath = path.join(
  appRoot,
  "src/features/explore/components/DiveSpotCard.tsx",
);
const mapProviderPath = path.join(appRoot, "src/providers/map-provider.tsx");
const exploreLayoutPath = path.join(
  appRoot,
  "src/features/explore/components/ExploreLayout.tsx",
);

test("live explore URL state uses current shareable filters", async () => {
  const source = await readFile(queryStatePath, "utf8");

  assert.match(source, /searchParams\.get\("q"\)/);
  assert.match(source, /searchParams\.get\("area"\)/);
  assert.match(source, /searchParams\.get\("difficulty"\)/);
  assert.match(source, /searchParams\.get\("verifiedOnly"\)/);
  assert.match(source, /searchParams\.get\("savedOnly"\)/);
  assert.match(source, /parseBounds/);
  assert.match(source, /searchParams\.get\("spotId"\)/);
  assert.match(source, /setSavedOnly/);
  assert.match(source, /nextParams\.set\("savedOnly", "true"\)/);
  assert.match(source, /nextParams\.delete\("savedOnly"\)/);
  assert.match(source, /router\.replace/);
  assert.doesNotMatch(source, /minRating/);
  assert.doesNotMatch(source, /parseTags/);
});

test("results panel has honest search, filter, count, empty, and error copy", async () => {
  const source = await readFile(resultsPanelPath, "utf8");

  assert.match(source, /Search by site, town, or area/);
  assert.match(source, /Verified only/);
  assert.match(source, /Saved/);
  assert.match(source, /Sign in to view saved dive spots/);
  assert.match(source, /Any level/);
  assert.match(source, /All areas/);
  assert.match(source, /Default order/);
  assert.doesNotMatch(source, /Relevance/);
  assert.match(source, /Showing .* loaded dive spot/);
  assert.match(source, /Could not load dive spots/);
  assert.match(source, /Clear the search, change filters/);
  assert.match(source, /No dive spots loaded in this map area/);
  assert.match(source, /No saved dive spots match this search/);
  assert.match(source, /Results match the last searched map area/);
});

test("saved-only flow is server-backed, auth-aware, and cache-safe", async () => {
  const source = await readFile(exploreLayoutPath, "utf8");

  assert.match(source, /savedOnlyRequiresSignIn/);
  assert.match(source, /enabled: canQueryExplore/);
  assert.match(source, /savedOnly: state\.savedOnly/);
  assert.match(source, /savedOnly: state\.savedOnly \|\| undefined/);
  assert.match(source, /invalidateQueries\(\{ queryKey: \["explore"\] \}\)/);
});

test("dive spot cards expose only real list-card facts and non-claiming buddy CTA", async () => {
  const source = await readFile(diveSpotCardPath, "utf8");

  assert.match(source, /depthMinM/);
  assert.match(source, /depthMaxM/);
  assert.match(source, /hazards/);
  assert.match(source, /lastConditionSummary/);
  assert.match(source, /verificationStatus/);
  assert.match(source, /buddySignal/);
  assert.match(source, /spot\.buddySignal\.label/);
  assert.match(source, /hasSiteActivity/);
  assert.match(source, /spot\.buddySignal \?/);
  assert.match(source, /hasSiteActivity\s*\?\s*"secondary"\s*:\s*"outline"/);
  assert.match(source, /Check buddy activity/);
  assert.doesNotMatch(source, /buddies nearby/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /aria-pressed/);
});

test("map provider keeps missing-key state product-grade and dev-only setup detail", async () => {
  const source = await readFile(mapProviderPath, "utf8");

  assert.match(source, /Map temporarily unavailable/);
  assert.match(source, /browse dive spots from the list/);
  assert.match(source, /NODE_ENV === "development"/);
  assert.match(source, /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
});
