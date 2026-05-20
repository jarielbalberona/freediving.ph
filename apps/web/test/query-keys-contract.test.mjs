import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/lib/query/query-keys.ts", import.meta.url),
  "utf8",
);

test("query key factories cover reactive public app surfaces", () => {
  for (const surface of [
    "session",
    "explore",
    "media",
    "profile",
    "feed",
    "diveSpots",
  ]) {
    assert.match(source, new RegExp(`${surface}: \\{`));
  }
});

test("query keys normalize unstable inputs before key construction", () => {
  for (const helper of [
    "normalizeExploreFilters",
    "normalizeDivePresenceFilters",
    "normalizeFeedParams",
    "normalizeMediaListParams",
    "normalizeMintMediaUrlItems",
    "normalizeProfileSearchParams",
  ]) {
    assert.match(source, new RegExp(`function ${helper}`));
  }
  assert.match(source, /\.sort\(\(a, b\) =>/);
  assert.match(source, /cleanString\(input\.q \?\? input\.search\)/);
  assert.match(source, /cleanNumber\(input\.lat, 4\)/);
});

test("query key factories return readonly tuple keys", () => {
  const asConstCount = source.match(/as const/g)?.length ?? 0;
  assert.ok(asConstCount >= 30, "expected factory keys to use as const tuples");
});
