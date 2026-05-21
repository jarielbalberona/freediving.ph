import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const source = await readFile(
  new URL("../src/lib/query/query-keys.ts", import.meta.url),
  "utf8",
);

const runTsxFixture = (code) => {
  const result = spawnSync(
    path.join(appRoot, "../../node_modules/.bin/tsx"),
    ["--eval", code],
    {
      cwd: appRoot,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test("query key factories cover reactive public app surfaces", () => {
  for (const surface of [
    "session",
    "explore",
    "media",
    "profile",
    "feed",
    "diveSpots",
    "notifications",
    "messages",
    "events",
    "groups",
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
    "normalizeQueryObject",
  ]) {
    assert.match(source, new RegExp(`function ${helper}`));
  }
  assert.match(source, /\.sort\(\(a, b\) =>/);
  assert.match(source, /cleanString\(input\.q \?\? input\.search\)/);
  assert.match(source, /cleanNumber\(input\.lat, 4\)/);
  assert.doesNotMatch(source, /cleanString\([^)]*\)\s*\?\?\s*""/);
});

test("query key factories return readonly tuple keys", () => {
  const asConstCount = source.match(/as const/g)?.length ?? 0;
  assert.ok(asConstCount >= 30, "expected factory keys to use as const tuples");
});

test("query key factories normalize semantic equivalents to stable keys", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import {
      normalizeQueryObject,
      queryKeys,
    } from "./src/lib/query/query-keys.ts";

    const stable = (value) => JSON.stringify(value);

    assert.deepEqual(normalizeQueryObject({
      q: "  apo ",
      empty: " ",
      tags: ["z", "a", ""],
      nested: { b: " two ", a: " one " },
    }), {
      nested: { a: "one", b: "two" },
      q: "apo",
      tags: ["a", "z"],
    });

    assert.equal(
      stable(queryKeys.explore.list({ search: " apo ", difficulty: "all" })),
      stable(queryKeys.explore.list({ q: "apo", difficulty: "" })),
    );
    assert.notEqual(
      stable(queryKeys.explore.list({ q: "apo", difficulty: "easy" })),
      stable(queryKeys.explore.list({ q: "apo", difficulty: "hard" })),
    );
    assert.equal(
      stable(queryKeys.chika.threadList(" ")),
      stable(queryKeys.chika.threadList(undefined)),
    );
    assert.equal(
      stable(queryKeys.media.mintUrls([
        { mediaId: "b", preset: "thumb" },
        { mediaId: "a", preset: "thumb" },
      ])),
      stable(queryKeys.media.mintUrls([
        { mediaId: "a", preset: "thumb" },
        { mediaId: "b", preset: "thumb" },
      ])),
    );
    assert.equal(
      stable(queryKeys.profile.search({ query: " ana ", limit: 10 })),
      stable(queryKeys.profile.search({ query: "ana", limit: 10 })),
    );
    assert.equal(
      stable(queryKeys.feed.activityList({ source: "activity", mode: " latest " })),
      stable(queryKeys.feed.activityList({ source: "activity", mode: "latest" })),
    );

    console.log("ok");
  `);
  assert.equal(output, "ok");
});
